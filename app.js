const STORAGE_KEY = 'campusLostFoundItems';
const AUTH_KEY = 'campusLostFoundAuth';
const USERS = [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'staff', password: 'staff123', role: 'staff' }
];

const DEFAULT_ITEMS = [
    {
        id: 'lost-1',
        type: 'lost',
        name: 'Lost Laptop Charger',
        description: 'Black 65W charger with USB-C cable.',
        location: 'Main Library',
        date: '2026-02-04',
        category: 'Accessories',
        image: 'shopping.webp',
        status: 'open'
    },
    {
        id: 'lost-2',
        type: 'lost',
        name: 'Lost Student ID',
        description: 'Blue lanyard with campus ID card.',
        location: 'Student Center',
        date: '2026-02-10',
        category: 'IDs',
        image: 'shopping1.webp',
        status: 'open'
    },
    {
        id: 'found-1',
        type: 'found',
        name: 'Found Notebook',
        description: 'Spiral notebook with handwritten notes.',
        location: 'Engineering Building',
        date: '2026-02-18',
        category: 'Books',
        image: 'shopping.webp',
        status: 'open'
    }
];

const FALLBACK_IMAGE = 'shopping.webp';

const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value || 'Unknown';
    }
    return date.toLocaleDateString();
};

const getAuth = () => {
    try {
        const stored = localStorage.getItem(AUTH_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.error('Failed to read auth', error);
        return null;
    }
};

const setAuth = (auth) => {
    try {
        localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
    } catch (error) {
        console.error('Failed to save auth', error);
    }
};

const clearAuth = () => {
    try {
        localStorage.removeItem(AUTH_KEY);
    } catch (error) {
        console.error('Failed to clear auth', error);
    }
};


const loadItems = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Failed to load items', error);
    }
    saveItems(DEFAULT_ITEMS);
    return [...DEFAULT_ITEMS];
};

const saveItems = (items) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
        console.error('Failed to save items', error);
    }
};



const createCard = (item) => {
    const card = document.createElement('a');
    card.className = 'item-card';
    card.href = `item_details.html?id=${encodeURIComponent(item.id)}`;

    const img = document.createElement('img');
    img.src = item.image || FALLBACK_IMAGE;
    img.alt = item.name;

    const title = document.createElement('h3');
    title.textContent = item.name;

    const description = document.createElement('p');
    const descriptionLabel = document.createElement('strong');
    descriptionLabel.textContent = 'Description: ';
    const descriptionText = document.createElement('span');
    descriptionText.textContent = item.description;
    description.append(descriptionLabel, descriptionText);

    const locationLabel = item.type === 'lost' ? 'Location' : 'Found at';
    const meta = document.createElement('div');
    meta.className = 'item-meta';
    const location = document.createElement('span');
    location.textContent = `${locationLabel}: ${item.location}`;
    const date = document.createElement('span');
    date.textContent = formatDate(item.date);
    meta.append(location, date);

    const pillRow = document.createElement('div');
    pillRow.className = 'item-pill-row';
    const statusPill = document.createElement('span');
    statusPill.className = `pill ${item.status === 'open' ? 'pill-open' : 'pill-resolved'}`;
    statusPill.textContent = item.status === 'open' ? 'Open' : 'Resolved';
    const categoryPill = document.createElement('span');
    categoryPill.className = 'pill pill-neutral';
    categoryPill.textContent = item.category;
    pillRow.append(statusPill, categoryPill);

    card.append(img, title, description, meta, pillRow);
    return card;
};

const tokenize = (text) => text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);

const getMatchSuggestions = (item, allItems, limit = 3) => {
    const targetTokens = new Set(tokenize(`${item.name} ${item.description} ${item.location}`));
    const candidates = allItems.filter((entry) => entry.type !== item.type && entry.status === 'open');
    const scored = candidates.map((entry) => {
        const tokens = tokenize(`${entry.name} ${entry.description} ${entry.location}`);
        const overlap = tokens.filter((token) => targetTokens.has(token)).length;
        const categoryBoost = entry.category === item.category ? 2 : 0;
        return { entry, score: overlap + categoryBoost };
    }).filter((itemScore) => itemScore.score > 0);

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((itemScore) => itemScore.entry);
};

const sortItems = (items, sortKey) => {
    const sorted = [...items];
    if (sortKey === 'oldest') {
        sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sortKey === 'name-az') {
        sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortKey === 'name-za') {
        sorted.sort((a, b) => b.name.localeCompare(a.name));
    } else {
        sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    return sorted;
};

const updateStats = (items, ids) => {
    const total = items.length;
    const open = items.filter((item) => item.status === 'open').length;
    const resolved = total - open;
    if (ids.total) ids.total.textContent = total;
    if (ids.open) ids.open.textContent = open;
    if (ids.resolved) ids.resolved.textContent = resolved;
};

const renderList = (items, container, emptyState) => {
    container.innerHTML = '';
    if (!items.length) {
        if (emptyState) {
            emptyState.hidden = false;
        }
        return;
    }
    if (emptyState) {
        emptyState.hidden = true;
    }
    items.forEach((item) => container.appendChild(createCard(item)));
};

const setupLostList = () => {
    const container = document.getElementById('lost-items');
    const emptyState = document.getElementById('lost-empty');
    const form = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const categorySelect = document.getElementById('category-select');
    const showResolved = document.getElementById('lost-show-resolved');
    const sortSelect = document.getElementById('lost-sort-select');
    const clearBtn = document.getElementById('lost-clear-filters');
    const stats = {
        total: document.getElementById('lost-total-count'),
        open: document.getElementById('lost-open-count'),
        resolved: document.getElementById('lost-resolved-count')
    };

    if (!container || !form || !searchInput || !categorySelect) {
        return;
    }

    const items = loadItems().filter((item) => item.type === 'lost');
    updateStats(items, stats);

    const applyFilter = () => {
        const query = searchInput.value.trim().toLowerCase();
        const category = categorySelect.value;
        const includeResolved = showResolved?.checked;
        const sortKey = sortSelect?.value || 'newest';

        const filtered = items.filter((item) => {
            const matchesQuery = [item.name, item.description, item.location]
                .join(' ')
                .toLowerCase()
                .includes(query);
            const matchesCategory = category === 'all' || item.category === category;
            const matchesStatus = includeResolved || item.status === 'open';
            return matchesQuery && matchesCategory && matchesStatus;
        });

        const sorted = sortItems(filtered, sortKey);
        renderList(sorted, container, emptyState);
    };

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        applyFilter();
    });
    searchInput.addEventListener('input', applyFilter);
    categorySelect.addEventListener('change', applyFilter);
    if (showResolved) {
        showResolved.addEventListener('change', applyFilter);
    }
    if (sortSelect) {
        sortSelect.addEventListener('change', applyFilter);
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            categorySelect.value = 'all';
            if (showResolved) showResolved.checked = false;
            if (sortSelect) sortSelect.value = 'newest';
            applyFilter();
        });
    }

    applyFilter();
};

const setupFoundList = () => {
    const container = document.getElementById('found-items');
    const emptyState = document.getElementById('found-empty');
    const form = document.getElementById('found-search-form');
    const searchInput = document.getElementById('found-search-input');
    const categorySelect = document.getElementById('found-category-select');
    const showResolved = document.getElementById('found-show-resolved');
    const sortSelect = document.getElementById('found-sort-select');
    const clearBtn = document.getElementById('found-clear-filters');
    const stats = {
        total: document.getElementById('found-total-count'),
        open: document.getElementById('found-open-count'),
        resolved: document.getElementById('found-resolved-count')
    };

    if (!container) {
        return;
    }

    const items = loadItems().filter((item) => item.type === 'found');
    updateStats(items, stats);

    const applyFilter = () => {
        const query = (searchInput?.value || '').trim().toLowerCase();
        const category = categorySelect?.value || 'all';
        const includeResolved = showResolved?.checked;
        const sortKey = sortSelect?.value || 'newest';

        const filtered = items.filter((item) => {
            const matchesQuery = [item.name, item.description, item.location]
                .join(' ')
                .toLowerCase()
                .includes(query);
            const matchesCategory = category === 'all' || item.category === category;
            const matchesStatus = includeResolved || item.status === 'open';
            return matchesQuery && matchesCategory && matchesStatus;
        });

        const sorted = sortItems(filtered, sortKey);
        renderList(sorted, container, emptyState);
    };

    if (form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            applyFilter();
        });
    }
    if (searchInput) {
        searchInput.addEventListener('input', applyFilter);
    }
    if (categorySelect) {
        categorySelect.addEventListener('change', applyFilter);
    }
    if (showResolved) {
        showResolved.addEventListener('change', applyFilter);
    }
    if (sortSelect) {
        sortSelect.addEventListener('change', applyFilter);
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (categorySelect) categorySelect.value = 'all';
            if (showResolved) showResolved.checked = false;
            if (sortSelect) sortSelect.value = 'newest';
            applyFilter();
        });
    }

    applyFilter();
};

const createAdminItem = (item, role, onUpdate) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'admin-item';

    const header = document.createElement('div');
    header.className = 'admin-item-header';

    const title = document.createElement('div');
    title.innerHTML = `<strong>${item.name}</strong> · ${item.type.toUpperCase()}`;

    const status = document.createElement('span');
    status.className = `pill ${item.status === 'open' ? 'pill-open' : 'pill-resolved'}`;
    status.textContent = item.status === 'open' ? 'Open' : 'Resolved';

    header.append(title, status);

    const meta = document.createElement('div');
    meta.className = 'item-meta';
    const location = document.createElement('span');
    location.textContent = `${item.type === 'lost' ? 'Last seen' : 'Found at'}: ${item.location}`;
    const date = document.createElement('span');
    date.textContent = formatDate(item.date);
    meta.append(location, date);

    const pills = document.createElement('div');
    pills.className = 'item-pill-row';
    const category = document.createElement('span');
    category.className = 'pill pill-neutral';
    category.textContent = item.category;
    pills.append(category);

    const actions = document.createElement('div');
    actions.className = 'admin-item-actions';

    if (item.status === 'open' && (role === 'admin' || role === 'staff')) {
        const resolveBtn = document.createElement('button');
        resolveBtn.className = 'btn-ghost';
        resolveBtn.type = 'button';
        resolveBtn.textContent = 'Mark Resolved';
        resolveBtn.addEventListener('click', () => onUpdate('resolve', item.id));
        actions.append(resolveBtn);
    }

    if (role === 'admin') {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-ghost';
        deleteBtn.type = 'button';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => onUpdate('delete', item.id));
        actions.append(deleteBtn);
    }

    wrapper.append(header, meta, pills, actions);
    return wrapper;
};

const createMatchBlock = (item, matches) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'admin-item';

    const title = document.createElement('div');
    title.innerHTML = `<strong>${item.name}</strong> · ${item.type.toUpperCase()}`;
    wrapper.append(title);

    if (!matches.length) {
        const empty = document.createElement('p');
        empty.className = 'muted-text';
        empty.textContent = 'No strong matches yet.';
        wrapper.append(empty);
        return wrapper;
    }

    matches.forEach((match) => {
        const line = document.createElement('div');
        line.className = 'item-meta';
        const label = document.createElement('span');
        label.textContent = match.name;
        const info = document.createElement('span');
        info.textContent = `${match.category} · ${match.location}`;
        line.append(label, info);
        wrapper.append(line);
    });

    return wrapper;
};

const setupAdminPage = () => {
    const loginCard = document.getElementById('admin-login-card');
    const dashboard = document.getElementById('admin-dashboard');
    const loginForm = document.getElementById('admin-login-form');
    const loginStatus = document.getElementById('admin-login-status');
    const loginHint = document.getElementById('admin-login-hint');
    const roleLabel = document.getElementById('admin-role-label');
    const logoutBtn = document.getElementById('admin-logout');
    const listEl = document.getElementById('admin-report-list');
    const matchEl = document.getElementById('admin-match-list');
    const filterType = document.getElementById('admin-filter-type');
    const filterStatus = document.getElementById('admin-filter-status');
    const sortSelect = document.getElementById('admin-sort');
    const stats = {
        total: document.getElementById('admin-total-count'),
        open: document.getElementById('admin-open-count'),
        resolved: document.getElementById('admin-resolved-count')
    };

    if (!loginCard || !dashboard || !loginForm || !listEl || !matchEl) {
        return;
    }

    const render = () => {
        const auth = getAuth();
        if (!auth) {
            loginCard.hidden = false;
            dashboard.hidden = true;
            return;
        }

        loginCard.hidden = true;
        dashboard.hidden = false;
        if (roleLabel) roleLabel.textContent = auth.role;

        const items = loadItems();
        updateStats(items, stats);

        const typeFilter = filterType?.value || 'all';
        const statusFilter = filterStatus?.value || 'all';
        const sortKey = sortSelect?.value || 'newest';

        const filtered = items.filter((item) => {
            const matchesType = typeFilter === 'all' || item.type === typeFilter;
            const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
            return matchesType && matchesStatus;
        });

        const sorted = sortItems(filtered, sortKey);
        listEl.innerHTML = '';
        sorted.forEach((item) => {
            listEl.append(createAdminItem(item, auth.role, (action, id) => {
                const current = loadItems();
                const index = current.findIndex((entry) => entry.id === id);
                if (index === -1) return;
                if (action === 'resolve') {
                    current[index].status = 'resolved';
                } else if (action === 'delete') {
                    current.splice(index, 1);
                }
                saveItems(current);
                render();
            }));
        });

        matchEl.innerHTML = '';
        const lostItems = items.filter((item) => item.type === 'lost' && item.status === 'open');
        lostItems.forEach((item) => {
            const matches = getMatchSuggestions(item, items, 2);
            matchEl.append(createMatchBlock(item, matches));
        });
    };

    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(loginForm);
        const username = String(formData.get('username')).trim();
        const password = String(formData.get('password')).trim();
        const user = USERS.find((entry) => entry.username === username && entry.password === password);
        if (!user) {
            if (loginStatus) loginStatus.textContent = 'Invalid credentials. Try again.';
            return;
        }
        if (loginStatus) loginStatus.textContent = '';
        setAuth({ username: user.username, role: user.role });
        render();
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            clearAuth();
            render();
        });
    }
    if (filterType) filterType.addEventListener('change', render);
    if (filterStatus) filterStatus.addEventListener('change', render);
    if (sortSelect) sortSelect.addEventListener('change', render);

    if (loginHint) {
        loginHint.textContent = 'Demo credentials: admin / admin123, staff / staff123';
    }

    render();
};

const readImageFile = (file) => new Promise((resolve) => {
    if (!file || (typeof file === 'object' && 'size' in file && file.size === 0)) {
        resolve('');
        return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
});

const setupReportForm = (options) => {
    const form = document.getElementById(options.formId);
    const statusEl = document.getElementById(options.statusId);

    if (!form || !statusEl) {
        return;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        statusEl.textContent = 'Saving your report...';

        const formData = new FormData(form);
        const imageFile = formData.get('image');
        const image = await readImageFile(imageFile);

        const newItem = {
            id: `${options.type}-${Date.now()}`,
            type: options.type,
            name: String(formData.get('name')).trim(),
            description: String(formData.get('description')).trim(),
            location: String(formData.get('location')).trim(),
            date: String(formData.get('date')),
            category: String(formData.get('category')),
            image: image || FALLBACK_IMAGE,
            status: 'open'
        };

        const items = loadItems();
        items.unshift(newItem);
        saveItems(items);

        statusEl.textContent = 'Report saved. Redirecting...';
        form.reset();

        setTimeout(() => {
            window.location.href = options.redirect;
        }, 800);
    });
};

const setupDetails = () => {
    const params = new URLSearchParams(window.location.search);
    const itemId = params.get('id');
    const statusEl = document.getElementById('detail-status');
    const actionBtn = document.getElementById('detail-action');

    if (!itemId) {
        if (statusEl) {
            statusEl.textContent = 'Item not found. Please return to the list.';
        }
        if (actionBtn) {
            actionBtn.disabled = true;
        }
        return;
    }

    const items = loadItems();
    const item = items.find((entry) => entry.id === itemId);

    if (!item) {
        if (statusEl) {
            statusEl.textContent = 'Item not found. Please return to the list.';
        }
        if (actionBtn) {
            actionBtn.disabled = true;
        }
        return;
    }

    const imageEl = document.getElementById('detail-image');
    const nameEl = document.getElementById('detail-name');
    const descriptionEl = document.getElementById('detail-description');
    const dateEl = document.getElementById('detail-date');
    const locationEl = document.getElementById('detail-location');
    const categoryEl = document.getElementById('detail-category');
    const suggestionsEl = document.getElementById('detail-suggestions');
    const suggestionsEmpty = document.getElementById('detail-suggestions-empty');

    if (imageEl) imageEl.src = item.image || FALLBACK_IMAGE;
    if (nameEl) nameEl.textContent = item.name;
    if (descriptionEl) descriptionEl.textContent = item.description;
    if (dateEl) dateEl.textContent = formatDate(item.date);
    if (locationEl) locationEl.textContent = item.location;
    if (categoryEl) categoryEl.textContent = item.category;

    if (suggestionsEl) {
        const matches = getMatchSuggestions(item, items, 3);
        renderList(matches, suggestionsEl, suggestionsEmpty);
    }

    if (actionBtn) {
        if (item.status !== 'open') {
            actionBtn.textContent = 'Already Resolved';
            actionBtn.disabled = true;
        } else {
            actionBtn.textContent = item.type === 'lost' ? 'Mark as Found' : 'Mark as Returned';
            actionBtn.addEventListener('click', () => {
                item.status = 'resolved';
                saveItems(items);
                if (statusEl) {
                    statusEl.textContent = 'Status updated. Returning to list...';
                }
                setTimeout(() => {
                    window.location.href = item.type === 'lost' ? 'index.html' : 'found.html';
                }, 800);
            });
        }
    }
};

const initApp = () => {
    const page = document.body.dataset.page;
    if (page === 'lost-list') {
        setupLostList();
    } else if (page === 'found-list') {
        setupFoundList();
    } else if (page === 'report-lost') {
        setupReportForm({
            formId: 'report-lost-form',
            statusId: 'lost-status',
            type: 'lost',
            redirect: 'index.html'
        });
    } else if (page === 'report-found') {
        setupReportForm({
            formId: 'report-found-form',
            statusId: 'found-status',
            type: 'found',
            redirect: 'found.html'
        });
    } else if (page === 'item-details') {
        setupDetails();
    } else if (page === 'admin') {
        setupAdminPage();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

