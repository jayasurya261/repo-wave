// Client-side filtering logic
const searchInput = document.getElementById('searchInput');
const languageRadios = document.querySelectorAll('input[name="language"]');
const difficultyRadios = document.querySelectorAll('input[name="difficulty"]');

const repoCards = document.querySelectorAll('[data-type="repo"]');
const issueCards = document.querySelectorAll('[data-type="issue"]');

const repoCountEl = document.getElementById('repoCount');
const issueCountEl = document.getElementById('issueCount');
const noReposMsg = document.getElementById('noReposMsg');
const noIssuesMsg = document.getElementById('noIssuesMsg');
const showMoreReposBtn = document.getElementById('showMoreReposBtn');
const showMoreIssuesBtn = document.getElementById('showMoreIssuesBtn');

const paginationContainer = document.getElementById('paginationContainer');

const isDashboard = window.location.pathname === '/' || window.location.pathname === '/index.html';
const isReposPage = window.location.pathname.includes('/repositories');
const isIssuesPage = window.location.pathname.includes('/issues');

let reposLimit = 10;
let issuesLimit = 10;

let currentPage = 1;
const itemsPerPage = 10;

function renderPagination(totalItemsCount) {
    if (!paginationContainer) return;

    paginationContainer.innerHTML = '';
    const totalPages = Math.ceil(totalItemsCount / itemsPerPage);

    if (totalPages <= 1) return;

    const nav = document.createElement('nav');
    nav.className = 'flex items-center justify-center space-x-2 mt-8';

    // Prev Button
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '&laquo; Prev';
    prevBtn.className = `px-3 py-1 rounded-md text-sm font-medium ${currentPage === 1 ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}`;
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; filterContent(); window.scrollTo(0, 0); } };
    nav.appendChild(prevBtn);

    // Page Numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.innerText = i.toString();
        pageBtn.className = `px-3 py-1 rounded-md text-sm font-medium border ${currentPage === i ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`;
        pageBtn.onclick = () => { currentPage = i; filterContent(); window.scrollTo(0, 0); };
        nav.appendChild(pageBtn);
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = 'Next &raquo;';
    nextBtn.className = `px-3 py-1 rounded-md text-sm font-medium ${currentPage === totalPages ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}`;
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => { if (currentPage < totalPages) { currentPage++; filterContent(); window.scrollTo(0, 0); } };
    nav.appendChild(nextBtn);

    paginationContainer.appendChild(nav);
}

function filterContent() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const selectedLangRaw = document.querySelector('input[name="language"]:checked');
    const selectedLang = selectedLangRaw ? selectedLangRaw.value : 'all';

    const selectedDiffRaw = document.querySelector('input[name="difficulty"]:checked');
    const selectedDiff = selectedDiffRaw ? selectedDiffRaw.value : 'all';

    let matchingReposCount = 0;
    let visibleReposCount = 0;

    repoCards.forEach((card) => {
        const el = card;
        const name = el.getAttribute('data-name') || '';
        const lang = el.getAttribute('data-lang') || '';

        const matchesSearch = name.includes(searchTerm);
        const matchesLang = selectedLang === 'all' || lang === selectedLang;

        if (matchesSearch && matchesLang) {
            matchingReposCount++;

            if (isDashboard) {
                if (visibleReposCount < reposLimit) {
                    el.style.display = '';
                    visibleReposCount++;
                } else {
                    el.style.display = 'none';
                }
            } else if (isReposPage) {
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;

                // 1-indexed matching count
                if (matchingReposCount > startIndex && matchingReposCount <= endIndex) {
                    el.style.display = '';
                } else {
                    el.style.display = 'none';
                }
            } else {
                el.style.display = 'none';
            }
        } else {
            el.style.display = 'none';
        }
    });

    let matchingIssuesCount = 0;
    let visibleIssuesCount = 0;

    issueCards.forEach((card) => {
        const el = card;
        const title = el.getAttribute('data-title') || '';
        const repo = el.getAttribute('data-repo') || '';
        const lang = el.getAttribute('data-lang') || '';
        const diff = el.getAttribute('data-difficulty') || '';

        const matchesSearch = title.includes(searchTerm) || repo.includes(searchTerm);
        const matchesDiff = selectedDiff === 'all' || diff === selectedDiff;
        const matchesLang = selectedLang === 'all' || lang === selectedLang;

        if (matchesSearch && matchesDiff && matchesLang) {
            matchingIssuesCount++;

            if (isDashboard) {
                if (visibleIssuesCount < issuesLimit) {
                    el.style.display = '';
                    visibleIssuesCount++;
                } else {
                    el.style.display = 'none';
                }
            } else if (isIssuesPage) {
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;

                if (matchingIssuesCount > startIndex && matchingIssuesCount <= endIndex) {
                    el.style.display = '';
                } else {
                    el.style.display = 'none';
                }
            } else {
                el.style.display = 'none';
            }
        } else {
            el.style.display = 'none';
        }
    });

    // Update counts
    if (repoCountEl) repoCountEl.textContent = matchingReposCount.toString();
    if (issueCountEl) issueCountEl.textContent = matchingIssuesCount.toString();

    // Update empty states
    if (noReposMsg) noReposMsg.style.display = matchingReposCount === 0 && repoCards.length > 0 ? 'block' : 'none';
    if (noIssuesMsg) noIssuesMsg.style.display = matchingIssuesCount === 0 && issueCards.length > 0 ? 'block' : 'none';

    // Update Dashboard "Show More" buttons
    if (isDashboard) {
        if (showMoreReposBtn) {
            showMoreReposBtn.style.display = matchingReposCount > reposLimit ? 'inline-flex' : 'none';
        }
        if (showMoreIssuesBtn) {
            showMoreIssuesBtn.style.display = matchingIssuesCount > issuesLimit ? 'inline-flex' : 'none';
        }
        if (paginationContainer) paginationContainer.innerHTML = '';
    }
    // Render Numbered Pagination on Repos or Issues pages
    else if (isReposPage) {
        renderPagination(matchingReposCount);
    } else if (isIssuesPage) {
        renderPagination(matchingIssuesCount);
    }
}

function resetLimits() {
    reposLimit = 10;
    issuesLimit = 10;
    currentPage = 1;
}

// Add event listeners
if (searchInput) {
    searchInput.addEventListener('input', () => { resetLimits(); filterContent(); });
}

languageRadios.forEach(radio => {
    radio.addEventListener('change', () => { resetLimits(); filterContent(); });
});

difficultyRadios.forEach(radio => {
    radio.addEventListener('change', () => { resetLimits(); filterContent(); });
});

if (showMoreReposBtn) {
    showMoreReposBtn.addEventListener('click', () => {
        reposLimit += 10;
        filterContent();
    });
}

if (showMoreIssuesBtn) {
    showMoreIssuesBtn.addEventListener('click', () => {
        issuesLimit += 10;
        filterContent();
    });
}

// Initial render
filterContent();
