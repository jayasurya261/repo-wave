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
    nav.className = 'flex flex-wrap items-center justify-center gap-2 mt-8';

    const createBtn = (text, pageNum, isActive, isDisabled, isEllipsis) => {
        const btn = document.createElement(isEllipsis ? 'span' : 'button');
        btn.innerHTML = text;
        if (isEllipsis) {
            btn.className = 'px-3 py-1 text-gray-500';
            return btn;
        }

        btn.className = `px-3 py-1 rounded-md text-sm font-medium border transition-colors ${isActive
            ? 'bg-indigo-600 text-white border-indigo-600'
            : isDisabled
                ? 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`;

        if (isDisabled) {
            btn.disabled = true;
        } else {
            btn.setAttribute('aria-label', typeof pageNum === 'number' ? `Page ${pageNum}` : text);
            btn.onclick = function () {
                currentPage = pageNum;
                filterContent();
                window.scrollTo(0, 0);
            };
        }
        return btn;
    };

    // Prev Button
    nav.appendChild(createBtn('&laquo; Prev', currentPage - 1, false, currentPage === 1, false));

    // Calculate window
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (currentPage <= 3) {
        endPage = Math.min(totalPages, 5);
    }
    if (currentPage >= totalPages - 2) {
        startPage = Math.max(1, totalPages - 4);
    }

    // First page + ellipsis
    if (startPage > 1) {
        nav.appendChild(createBtn('1', 1, false, false, false));
        if (startPage > 2) {
            nav.appendChild(createBtn('...', null, false, false, true));
        }
    }

    // Page Numbers
    for (let i = startPage; i <= endPage; i++) {
        nav.appendChild(createBtn(i.toString(), i, currentPage === i, false, false));
    }

    // Last page + ellipsis
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            nav.appendChild(createBtn('...', null, false, false, true));
        }
        nav.appendChild(createBtn(totalPages.toString(), totalPages, false, false, false));
    }

    // Next Button
    nav.appendChild(createBtn('Next &raquo;', currentPage + 1, false, currentPage === totalPages, false));

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
        const diff = el.getAttribute('data-difficulty') || '';

        const matchesSearch = name.includes(searchTerm);
        const matchesLang = selectedLang === 'all' || lang === selectedLang;
        const matchesDiff = selectedDiff === 'all' || diff === selectedDiff;

        if (matchesSearch && matchesLang && matchesDiff) {
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

function showLoadingSpinner(callback, btnElement) {
    if (!btnElement) {
        callback();
        return;
    }

    const originalText = btnElement.innerHTML;
    const originalWidth = btnElement.offsetWidth;

    // Set fixed width so button doesn't shrink when text is replaced
    if (originalWidth > 0) {
        btnElement.style.width = `${originalWidth}px`;
    }

    // Disable button and add spinner
    btnElement.disabled = true;
    btnElement.innerHTML = `
        <svg class="animate-spin h-5 w-5 text-green-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    `;

    // Simulate network delay
    setTimeout(() => {
        // Restore button state
        btnElement.innerHTML = originalText;
        btnElement.style.width = '';
        btnElement.disabled = false;

        callback();
    }, 400);
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
    showMoreReposBtn.addEventListener('click', function () {
        showLoadingSpinner(() => {
            reposLimit += 10;
            filterContent();
        }, this);
    });
}

if (showMoreIssuesBtn) {
    showMoreIssuesBtn.addEventListener('click', function () {
        showLoadingSpinner(() => {
            issuesLimit += 10;
            filterContent();
        }, this);
    });
}

// Initial render
filterContent();
