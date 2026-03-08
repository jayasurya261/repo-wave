/**
 * filter.js — real API-backed filtering & pagination
 *
 * Replaces the old approach of hiding/showing thousands of DOM nodes.
 * On every filter / search / page change it calls /api/issues or /api/repos
 * with the current params and renders only the returned page of items.
 */

const isDashboard = window.location.pathname === '/' || window.location.pathname === '/index.html';
const isReposPage = window.location.pathname.includes('/repositories');
const isIssuesPage = window.location.pathname.includes('/issues');

const searchInput = document.getElementById('searchInput');
const paginationContainer = document.getElementById('paginationContainer');
const repoListEl = document.getElementById('repoList');
const issueListEl = document.getElementById('issueList');
const repoCountEl = document.getElementById('repoCount');
const issueCountEl = document.getElementById('issueCount');
const noReposMsg = document.getElementById('noReposMsg');
const noIssuesMsg = document.getElementById('noIssuesMsg');

// Dashboard "show more" buttons still exist but now trigger real API calls
const showMoreReposBtn = document.getElementById('showMoreReposBtn');
const showMoreIssuesBtn = document.getElementById('showMoreIssuesBtn');

let currentPage = 1;
let dashboardIssuesPage = 1;
let dashboardReposPage = 1;
let debounceTimer = null;

// ── Helpers ────────────────────────────────────────────────────────────────

function getFilters() {
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    const langEl = document.querySelector('input[name="language"]:checked');
    const diffEl = document.querySelector('input[name="difficulty"]:checked');
    return {
        q: searchTerm,
        lang: langEl ? langEl.value : 'all',
        difficulty: diffEl ? diffEl.value : 'all',
    };
}

function buildQuery(base, page, filters) {
    const u = new URL(base, window.location.origin);
    u.searchParams.set('page', String(page));
    if (filters.q) u.searchParams.set('q', filters.q);
    if (filters.lang !== 'all') u.searchParams.set('lang', filters.lang);
    if (filters.difficulty !== 'all') u.searchParams.set('difficulty', filters.difficulty);
    return u.toString();
}

function setLoading(container, loading) {
    if (!container) return;
    if (loading) {
        container.innerHTML = `
      <div class="py-10 flex justify-center">
        <svg class="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>`;
    }
}

// ── Card renderers ─────────────────────────────────────────────────────────

function diffLabel(score) {
    if (score == null) return null;
    if (score <= 25) return { text: 'Easy', cls: 'bg-green-100 text-green-800' };
    if (score <= 50) return { text: 'Medium', cls: 'bg-yellow-100 text-yellow-800' };
    if (score <= 75) return { text: 'Hard', cls: 'bg-orange-100 text-orange-800' };
    return { text: 'Very Hard', cls: 'bg-red-100 text-red-800' };
}

function repoDiff(health) {
    if (health == null) return null;
    if (health >= 75) return { text: 'Easy', cls: 'bg-green-100 text-green-800', key: 'easy' };
    if (health >= 50) return { text: 'Medium', cls: 'bg-yellow-100 text-yellow-800', key: 'medium' };
    if (health >= 25) return { text: 'Hard', cls: 'bg-red-100 text-red-800', key: 'hard' };
    return { text: 'Very Hard', cls: 'bg-red-100 text-red-800', key: 'very-hard' };
}

function renderIssueCard(issue) {
    const parts = issue.url ? issue.url.split('/') : [];
    const issueNum = parts[parts.length - 1];
    const internalUrl = `/issue/${issue.repo_id}/${issueNum}`;
    const d = diffLabel(issue.difficulty_score);
    const labels = Array.isArray(issue.labels?.tags) ? issue.labels.tags : (Array.isArray(issue.labels) ? issue.labels : []);
    const date = issue.created_at ? new Date(issue.created_at).toLocaleDateString() : '';

    return `
    <div class="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        <div class="min-w-0 flex-1">
          <a href="${internalUrl}" class="text-base font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline inline-block break-words">
            ${escHtml(issue.title)}
          </a>
          <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
            ${escHtml(issue.repo_id)} &middot; <span class="whitespace-nowrap">${date}</span>
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2 flex-shrink-0">
          ${issue.language ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300">${escHtml(issue.language)}</span>` : ''}
          ${d ? `<span class="text-xs font-semibold px-2 py-0.5 rounded-full ${d.cls}">Difficulty: ${d.text}</span>` : ''}
        </div>
      </div>
      ${labels.length > 0 ? `
        <div class="flex flex-wrap gap-1.5 mt-2">
          ${labels.map(l => `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">${escHtml(typeof l === 'string' ? l : l.name || '')}</span>`).join('')}
        </div>` : ''}
    </div>`;
}

function renderRepoCard(repo) {
    const d = repoDiff(repo.health_score);
    const date = repo.last_active ? new Date(repo.last_active).toLocaleDateString() : null;

    return `
    <div data-type="repo" class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-green-500 hover:shadow-md transition-shadow flex flex-col overflow-hidden">
      <div class="p-5 flex-grow">
        <div class="flex items-center justify-between mb-3">
          <a href="/repo/${escHtml(repo.full_name)}" class="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">${escHtml(repo.name)}</a>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300">${escHtml(repo.language ?? '')}</span>
        </div>
        <div class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
          <span class="truncate">${escHtml(repo.full_name)}</span>
          ${date ? `<span class="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 whitespace-nowrap self-start sm:self-auto" title="Last Active">Active: ${date}</span>` : ''}
        </div>
        <div class="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2">
          <span class="flex items-center gap-1" title="Stars">
            <svg class="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            ${(repo.stars ?? 0).toLocaleString()}
          </span>
          <span class="flex items-center gap-1" title="Forks">
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
            ${(repo.forks ?? 0).toLocaleString()}
          </span>
          ${d ? `<span class="ml-auto text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full ${d.cls}">Difficulty: ${d.text}</span>` : ''}
        </div>
      </div>
    </div>`;
}

function escHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ── Pagination ─────────────────────────────────────────────────────────────

function renderPagination(total, pageSize, page, onNavigate) {
    if (!paginationContainer) return;
    paginationContainer.innerHTML = '';
    const totalPages = Math.ceil(total / pageSize);
    if (totalPages <= 1) return;

    const nav = document.createElement('nav');
    nav.className = 'flex flex-wrap items-center justify-center gap-2 mt-8';

    const btn = (label, targetPage, active, disabled) => {
        const el = document.createElement('button');
        el.innerHTML = label;
        el.className = `px-3 py-1 rounded-md text-sm font-medium border transition-colors ${active
            ? 'bg-indigo-600 text-white border-indigo-600'
            : disabled
                ? 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`;
        if (disabled) {
            el.disabled = true;
        } else {
            el.setAttribute('aria-label', typeof targetPage === 'number' ? `Page ${targetPage}` : label);
            el.onclick = () => { onNavigate(targetPage); window.scrollTo(0, 0); };
        }
        return el;
    };

    nav.appendChild(btn('&laquo; Prev', page - 1, false, page === 1));

    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, page + 2);
    if (page <= 3) end = Math.min(totalPages, 5);
    if (page >= totalPages - 2) start = Math.max(1, totalPages - 4);

    if (start > 1) {
        nav.appendChild(btn('1', 1, false, false));
        if (start > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '…';
            ellipsis.className = 'px-3 py-1 text-gray-500';
            nav.appendChild(ellipsis);
        }
    }

    for (let i = start; i <= end; i++) {
        nav.appendChild(btn(String(i), i, i === page, false));
    }

    if (end < totalPages) {
        if (end < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '…';
            ellipsis.className = 'px-3 py-1 text-gray-500';
            nav.appendChild(ellipsis);
        }
        nav.appendChild(btn(String(totalPages), totalPages, false, false));
    }

    nav.appendChild(btn('Next &raquo;', page + 1, false, page === totalPages));
    paginationContainer.appendChild(nav);
}

// ── Fetch functions ────────────────────────────────────────────────────────

async function fetchIssues(page, filters) {
    const res = await fetch(buildQuery('/api/issues', page, filters));
    if (!res.ok) throw new Error('Failed to load issues');
    return res.json();
}

async function fetchRepos(page, filters) {
    const res = await fetch(buildQuery('/api/repos', page, filters));
    if (!res.ok) throw new Error('Failed to load repos');
    return res.json();
}

// ── Page-specific renderers ────────────────────────────────────────────────

async function refreshIssues(page, filters) {
    if (!issueListEl) return;
    setLoading(issueListEl, true);
    try {
        const { items, total, pageSize } = await fetchIssues(page, filters);
        if (issueCountEl) issueCountEl.textContent = String(total);
        if (items.length === 0) {
            issueListEl.innerHTML = '';
            if (noIssuesMsg) noIssuesMsg.style.display = 'block';
        } else {
            if (noIssuesMsg) noIssuesMsg.style.display = 'none';
            issueListEl.innerHTML = items.map(renderIssueCard).join('');
        }
        if (!isDashboard) {
            renderPagination(total, pageSize, page, (p) => { currentPage = p; refreshIssues(p, getFilters()); });
        } else if (showMoreIssuesBtn) {
            showMoreIssuesBtn.style.display = total > page * pageSize ? 'inline-flex' : 'none';
        }
    } catch {
        issueListEl.innerHTML = '<p class="text-gray-500 p-4">Could not load issues. Please try again.</p>';
    }
}

async function refreshRepos(page, filters) {
    if (!repoListEl) return;
    setLoading(repoListEl, true);
    try {
        const { items, total, pageSize } = await fetchRepos(page, filters);
        if (repoCountEl) repoCountEl.textContent = String(total);
        if (items.length === 0) {
            repoListEl.innerHTML = '';
            if (noReposMsg) noReposMsg.style.display = 'block';
        } else {
            if (noReposMsg) noReposMsg.style.display = 'none';
            repoListEl.innerHTML = items.map(renderRepoCard).join('');
        }
        if (!isDashboard) {
            renderPagination(total, pageSize, page, (p) => { currentPage = p; refreshRepos(p, getFilters()); });
        } else if (showMoreReposBtn) {
            showMoreReposBtn.style.display = total > page * pageSize ? 'inline-flex' : 'none';
        }
    } catch {
        repoListEl.innerHTML = '<p class="text-gray-500 p-4">Could not load repositories. Please try again.</p>';
    }
}

// ── Main refresh orchestrator ──────────────────────────────────────────────

function refresh(resetPage = true) {
    if (resetPage) { currentPage = 1; dashboardIssuesPage = 1; dashboardReposPage = 1; }
    const filters = getFilters();
    if (isDashboard) {
        refreshIssues(dashboardIssuesPage, filters);
        refreshRepos(dashboardReposPage, filters);
    } else if (isIssuesPage) {
        refreshIssues(currentPage, filters);
    } else if (isReposPage) {
        refreshRepos(currentPage, filters);
    }
}

// ── Event listeners ────────────────────────────────────────────────────────

if (searchInput) {
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => refresh(true), 300);
    });
}

document.querySelectorAll('input[name="language"]').forEach(r =>
    r.addEventListener('change', () => refresh(true))
);
document.querySelectorAll('input[name="difficulty"]').forEach(r =>
    r.addEventListener('change', () => refresh(true))
);

if (showMoreIssuesBtn) {
    showMoreIssuesBtn.addEventListener('click', () => {
        dashboardIssuesPage++;
        // Append mode for dashboard "show more"
        const filters = getFilters();
        fetchIssues(dashboardIssuesPage, filters).then(({ items, total, pageSize }) => {
            issueListEl.insertAdjacentHTML('beforeend', items.map(renderIssueCard).join(''));
            if (showMoreIssuesBtn) showMoreIssuesBtn.style.display = total > dashboardIssuesPage * pageSize ? 'inline-flex' : 'none';
        });
    });
}

if (showMoreReposBtn) {
    showMoreReposBtn.addEventListener('click', () => {
        dashboardReposPage++;
        const filters = getFilters();
        fetchRepos(dashboardReposPage, filters).then(({ items, total, pageSize }) => {
            repoListEl.insertAdjacentHTML('beforeend', items.map(renderRepoCard).join(''));
            if (showMoreReposBtn) showMoreReposBtn.style.display = total > dashboardReposPage * pageSize ? 'inline-flex' : 'none';
        });
    });
}

// ── Initial load ───────────────────────────────────────────────────────────
// Strategy:
// 1. Fetch the real total from the API to set count badges & Show More visibility.
// 2. If the list is already server-rendered (≥1 item), preserve it — don't re-render.
// 3. If empty (Supabase failed at build time), do a full render.
async function initCounts() {
    const filters = getFilters();
    if (isDashboard || isIssuesPage) {
        if (issueListEl) {
            try {
                const { total, pageSize } = await fetchIssues(1, filters);
                if (issueCountEl) issueCountEl.textContent = String(total);
                // If list was empty, do a full render; otherwise just update Show More
                if (issueListEl.children.length === 0) {
                    await refreshIssues(1, filters);
                } else if (isDashboard && showMoreIssuesBtn) {
                    showMoreIssuesBtn.style.display = total > pageSize ? 'inline-flex' : 'none';
                } else if (!isDashboard) {
                    renderPagination(total, pageSize, 1, (p) => { currentPage = p; refreshIssues(p, getFilters()); });
                }
            } catch { /* non-fatal — counts stay as server-rendered */ }
        }
    }
    if (isDashboard || isReposPage) {
        if (repoListEl) {
            try {
                const { total, pageSize } = await fetchRepos(1, filters);
                if (repoCountEl) repoCountEl.textContent = String(total);
                if (repoListEl.children.length === 0) {
                    await refreshRepos(1, filters);
                } else if (isDashboard && showMoreReposBtn) {
                    showMoreReposBtn.style.display = total > pageSize ? 'inline-flex' : 'none';
                } else if (!isDashboard) {
                    renderPagination(total, pageSize, 1, (p) => { currentPage = p; refreshRepos(p, getFilters()); });
                }
            } catch { /* non-fatal */ }
        }
    }
}

initCounts();
