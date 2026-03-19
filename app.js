// === Portal AI — Adoção de Inteligência Artificial ===

const STORAGE_KEY = 'portal-ai-requests';
let currentDetailId = null;
let currentPage = 'home';

// --- Data Layer ---
function loadRequests() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function saveRequests(requests) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// --- Dashboard Stats ---
function updateDashboard() {
    const requests = loadRequests();
    const today = new Date().toISOString().split('T')[0];

    const total = requests.length;
    const progress = requests.filter(r => r.status === 'Em curso').length;
    const done = requests.filter(r => r.status === 'Finalizado').length;
    const overdue = requests.filter(r =>
        r.deadline && r.deadline < today && r.status !== 'Finalizado'
    ).length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-progress').textContent = String(progress).padStart(2, '0');
    document.getElementById('stat-done').textContent = String(done).padStart(2, '0');
    document.getElementById('stat-overdue').textContent = String(overdue).padStart(2, '0');

    // Period label
    const now = new Date();
    const months = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
    document.getElementById('statPeriod').textContent = `JAN - ${months[now.getMonth()]} ${now.getFullYear()}`;

    // Trend
    const trendEl = document.getElementById('statTrend');
    if (done > 0) {
        trendEl.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg> +${done > 1 ? Math.round((done / total) * 100) : 0}% vs last month`;
    }

    // Notification dot
    const notifDot = document.getElementById('notifDot');
    if (overdue > 0) {
        notifDot.classList.add('active');
    } else {
        notifDot.classList.remove('active');
    }

    // Footer sync
    document.getElementById('footerSync').textContent =
        `LAST SYNCHRONIZED: ${now.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()} - ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} GMT`;

    // Capacity
    const nonWaiting = requests.filter(r => r.status !== 'Em espera').length;
    const capacity = total > 0 ? Math.round(((done + progress) / total) * 100) : 0;
    document.getElementById('capacityValue').textContent = capacity + '%';

    // Area chart + tabs
    renderAreaChart(requests);

    // Actions
    renderActions(requests, today);
}

// --- Area Chart ---
function renderAreaChart(requests) {
    const areas = {};
    requests.forEach(r => {
        const a = r.area || 'Outros';
        areas[a] = (areas[a] || 0) + 1;
    });

    const sortedAreas = Object.entries(areas).sort((a, b) => b[1] - a[1]);
    const maxCount = Math.max(...sortedAreas.map(a => a[1]), 1);
    const colors = ['#2563eb', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

    const chartEl = document.getElementById('areaChart');
    chartEl.innerHTML = sortedAreas.map(([area, count], i) => {
        const height = Math.max(10, (count / maxCount) * 90);
        const color = colors[i % colors.length];
        return `<div class="area-bar" style="height:${height}%;background:${color}" title="${escapeHtml(area)}: ${count}"></div>`;
    }).join('');

    const tabsEl = document.getElementById('areaTabs');
    // Show abbreviations
    const abbreviations = sortedAreas.slice(0, 6).map(([area]) => {
        const words = area.split(/[\s\/]+/);
        if (words.length === 1) return area.substring(0, 3).toUpperCase();
        return words.map(w => w[0]).join('').toUpperCase();
    });

    tabsEl.innerHTML = abbreviations.map((abbr, i) => {
        const fullName = sortedAreas[i][0];
        return `<button class="area-tab${i === 0 ? ' active' : ''}" title="${escapeHtml(fullName)}" onclick="selectAreaTab(this)">${abbr}</button>`;
    }).join('');
}

function selectAreaTab(el) {
    document.querySelectorAll('.area-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
}

// --- Actions ---
function renderActions(requests, today) {
    const overdue = requests.filter(r => r.deadline && r.deadline < today && r.status !== 'Finalizado');
    const waiting = requests.filter(r => r.status === 'Em espera');
    const highPriority = requests.filter(r => r.priority === 'Alta' && r.status !== 'Finalizado');

    const actions = [];
    if (overdue.length > 0) {
        actions.push(`Rever prioridades de ${overdue.length} pedido${overdue.length > 1 ? 's' : ''} atrasado${overdue.length > 1 ? 's' : ''}`);
    }
    if (waiting.length > 0) {
        actions.push(`Desbloquear ${waiting.length} pedido${waiting.length > 1 ? 's' : ''} em espera`);
    }
    if (highPriority.length > 0) {
        actions.push(`Acompanhar ${highPriority.length} iniciativa${highPriority.length > 1 ? 's' : ''} de alta prioridade`);
    }
    if (actions.length === 0) {
        actions.push('Nenhuma ação pendente');
    }

    document.getElementById('actionsList').innerHTML = actions.map(a =>
        `<div class="action-item" onclick="toggleAction(this)">
            <div class="action-check"></div>
            <span>${escapeHtml(a)}</span>
        </div>`
    ).join('');
}

function toggleAction(el) {
    el.classList.toggle('checked');
}

// --- Últimas Atualizações ---
function renderUpdates() {
    const requests = loadRequests();
    const search = (document.getElementById('globalSearch').value || '').toLowerCase();
    const today = new Date().toISOString().split('T')[0];

    let filtered = requests;
    if (search) {
        filtered = filtered.filter(r =>
            r.title.toLowerCase().includes(search) ||
            (r.description || '').toLowerCase().includes(search) ||
            (r.area || '').toLowerCase().includes(search)
        );
    }

    // Sort by updatedAt descending
    filtered.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

    const listEl = document.getElementById('updatesList');
    const top5 = filtered.slice(0, 5);

    if (top5.length === 0) {
        listEl.innerHTML = '<p style="color:var(--gray-400);font-size:14px;padding:16px 0;">Nenhuma atualização encontrada.</p>';
        return;
    }

    listEl.innerHTML = top5.map(r => {
        const isOverdue = r.deadline && r.deadline < today && r.status !== 'Finalizado';
        const statusClass = getStatusCssClass(r.status);
        const iconClass = getIconClass(r.status, isOverdue);
        const iconChar = getIconChar(r.status, isOverdue);
        const tagClass = getTagClass(r.status, isOverdue);
        const tagLabel = isOverdue ? 'ATRASADO' : r.status.toUpperCase();
        const timeAgo = getTimeAgo(r.updatedAt);

        return `
        <div class="update-item ${statusClass} ${isOverdue ? 'overdue' : ''}" onclick="openDetail('${r.id}')">
            <div class="update-icon ${iconClass}">${iconChar}</div>
            <div class="update-body">
                <div class="update-header-row">
                    <span class="update-name">${escapeHtml(r.title)}</span>
                    <span class="update-time">${timeAgo}</span>
                </div>
                <div class="update-desc">${escapeHtml(r.description || r.nextStep || '—')}</div>
                <div class="update-tags">
                    ${r.area ? `<span class="tag">${escapeHtml(r.area.toUpperCase())}</span>` : ''}
                    <span class="tag tag-status ${tagClass}">${tagLabel}</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

// --- Sidebar Filters ---
function toggleSidebarFilter(btn, type) {
    const wasActive = btn.classList.contains('active');
    // Toggle the options panel
    const optionsId = type === 'status' ? 'filterStatusOptions'
        : type === 'area' ? 'filterAreaOptions'
        : 'filterPriorityOptions';

    const optionsEl = document.getElementById(optionsId);
    if (wasActive) {
        btn.classList.remove('active');
        optionsEl.classList.add('hidden');
    } else {
        btn.classList.add('active');
        optionsEl.classList.remove('hidden');
    }
}

function updateSidebarAreaOptions() {
    const requests = loadRequests();
    const areas = [...new Set(requests.map(r => r.area).filter(Boolean))].sort();
    const container = document.getElementById('filterAreaOptions');
    container.innerHTML = areas.map(a =>
        `<label class="filter-option"><input type="checkbox" value="${escapeHtml(a)}" onchange="applyFilters()"> ${escapeHtml(a)}</label>`
    ).join('');
}

function getActiveFilters() {
    const getChecked = (containerId) => {
        const container = document.getElementById(containerId);
        return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    };
    return {
        statuses: getChecked('filterStatusOptions'),
        areas: getChecked('filterAreaOptions'),
        priorities: getChecked('filterPriorityOptions')
    };
}

function applyFilters() {
    renderUpdates();
    if (currentPage === 'initiatives') renderInitiatives();
}

function toggleNotifications() {
    quickFilter('overdue');
}

// --- Quick Filter from stat cards ---
function quickFilter(type) {
    showPage('initiatives');

    // Clear existing checkboxes
    document.querySelectorAll('.sidebar-filter-options input[type="checkbox"]').forEach(cb => cb.checked = false);

    if (type && type !== 'overdue') {
        const statusBoxes = document.querySelectorAll('#filterStatusOptions input[type="checkbox"]');
        statusBoxes.forEach(cb => {
            if (cb.value === type) cb.checked = true;
        });
    }

    // Store overdue flag
    window._showOverdueOnly = (type === 'overdue');
    renderInitiatives();
}

// --- Initiatives Page ---
function renderInitiatives() {
    const requests = loadRequests();
    const search = (document.getElementById('initiativesSearch')?.value || '').toLowerCase();
    const today = new Date().toISOString().split('T')[0];
    const filters = getActiveFilters();

    let filtered = requests.filter(r => {
        if (search && !r.title.toLowerCase().includes(search) &&
            !(r.description || '').toLowerCase().includes(search) &&
            !(r.area || '').toLowerCase().includes(search)) return false;
        if (filters.statuses.length > 0 && !filters.statuses.includes(r.status)) return false;
        if (filters.areas.length > 0 && !filters.areas.includes(r.area)) return false;
        if (filters.priorities.length > 0 && !filters.priorities.includes(r.priority)) return false;
        return true;
    });

    if (window._showOverdueOnly) {
        filtered = filtered.filter(r => r.deadline && r.deadline < today && r.status !== 'Finalizado');
    }

    // Sort
    const priorityOrder = { 'Alta': 0, 'Média': 1, 'Baixa': 2 };
    filtered.sort((a, b) => {
        const aOverdue = a.deadline && a.deadline < today && a.status !== 'Finalizado';
        const bOverdue = b.deadline && b.deadline < today && b.status !== 'Finalizado';
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        const aPri = priorityOrder[a.priority] ?? 1;
        const bPri = priorityOrder[b.priority] ?? 1;
        if (aPri !== bPri) return aPri - bPri;
        return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });

    const container = document.getElementById('initiativesList');
    const empty = document.getElementById('emptyState');

    if (filtered.length === 0) {
        container.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    container.innerHTML = filtered.map(r => {
        const isOverdue = r.deadline && r.deadline < today && r.status !== 'Finalizado';
        const statusClass = getStatusCssClass(r.status);
        const tagClass = getTagClass(r.status, isOverdue);
        const priorityTag = getPriorityTagClass(r.priority);

        return `
        <div class="initiative-card ${statusClass} ${isOverdue ? 'overdue' : ''}" onclick="openDetail('${r.id}')">
            <div class="initiative-card-header">
                <span class="initiative-card-title">${escapeHtml(r.title)}</span>
                <div style="display:flex;gap:6px;">
                    <span class="tag tag-status ${tagClass}">${isOverdue ? 'ATRASADO' : escapeHtml(r.status.toUpperCase())}</span>
                    <span class="tag tag-status ${priorityTag}">${escapeHtml(r.priority || 'MÉDIA')}</span>
                </div>
            </div>
            ${r.description ? `<div class="initiative-card-desc">${escapeHtml(r.description)}</div>` : ''}
            <div class="initiative-card-meta">
                ${r.area ? `<span>◈ ${escapeHtml(r.area)}</span>` : ''}
                ${r.responsible ? `<span>○ ${escapeHtml(r.responsible)}</span>` : ''}
                ${r.deadline ? `<span>◷ ${formatDate(r.deadline)}</span>` : ''}
            </div>
            ${r.nextStep ? `
            <div class="initiative-card-footer">
                <span>→</span>
                <strong>Próximo:</strong> ${escapeHtml(r.nextStep)}
            </div>` : ''}
        </div>`;
    }).join('');
}

// --- Analytics Page ---
function renderAnalytics() {
    const requests = loadRequests();
    const today = new Date().toISOString().split('T')[0];
    const container = document.getElementById('analyticsContent');

    // By status
    const statuses = ['Por começar', 'Em curso', 'Em espera', 'Finalizado'];
    const statusColors = { 'Por começar': '#94a3b8', 'Em curso': '#2563eb', 'Em espera': '#f59e0b', 'Finalizado': '#10b981' };
    const statusCounts = statuses.map(s => ({ label: s, count: requests.filter(r => r.status === s).length }));

    // By area
    const areas = {};
    requests.forEach(r => { const a = r.area || 'Outros'; areas[a] = (areas[a] || 0) + 1; });
    const areaSorted = Object.entries(areas).sort((a, b) => b[1] - a[1]);

    // By priority
    const priorities = ['Alta', 'Média', 'Baixa'];
    const priColors = { 'Alta': '#ef4444', 'Média': '#f59e0b', 'Baixa': '#94a3b8' };
    const priCounts = priorities.map(p => ({ label: p, count: requests.filter(r => r.priority === p).length }));

    const maxStatus = Math.max(...statusCounts.map(s => s.count), 1);
    const maxArea = Math.max(...areaSorted.map(a => a[1]), 1);
    const maxPri = Math.max(...priCounts.map(p => p.count), 1);

    container.innerHTML = `
        <div class="analytics-card">
            <div class="analytics-card-title">Por Estado</div>
            <div class="analytics-bar-group">
                ${statusCounts.map(s => `
                    <div class="analytics-bar-item">
                        <span class="analytics-bar-label">${escapeHtml(s.label)}</span>
                        <div class="analytics-bar-track">
                            <div class="analytics-bar-fill" style="width:${(s.count/maxStatus)*100}%;background:${statusColors[s.label]}">${s.count}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="analytics-card">
            <div class="analytics-card-title">Por Área</div>
            <div class="analytics-bar-group">
                ${areaSorted.map(([ area, count ], i) => {
                    const colors = ['#2563eb','#6366f1','#8b5cf6','#a855f7','#ec4899','#f59e0b','#10b981','#94a3b8'];
                    return `
                    <div class="analytics-bar-item">
                        <span class="analytics-bar-label">${escapeHtml(area)}</span>
                        <div class="analytics-bar-track">
                            <div class="analytics-bar-fill" style="width:${(count/maxArea)*100}%;background:${colors[i % colors.length]}">${count}</div>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>
        <div class="analytics-card">
            <div class="analytics-card-title">Por Prioridade</div>
            <div class="analytics-bar-group">
                ${priCounts.map(p => `
                    <div class="analytics-bar-item">
                        <span class="analytics-bar-label">${escapeHtml(p.label)}</span>
                        <div class="analytics-bar-track">
                            <div class="analytics-bar-fill" style="width:${(p.count/maxPri)*100}%;background:${priColors[p.label]}">${p.count}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// --- Navigation ---
function showPage(page) {
    currentPage = page;
    window._showOverdueOnly = false;

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.topnav-link').forEach(l => l.classList.remove('active'));

    const pageMap = { home: 'pageHome', initiatives: 'pageInitiatives', analytics: 'pageAnalytics' };
    document.getElementById(pageMap[page]).classList.add('active');
    document.querySelector(`.topnav-link[data-page="${page}"]`).classList.add('active');

    if (page === 'initiatives') renderInitiatives();
    if (page === 'analytics') renderAnalytics();
}

// Setup nav links
document.querySelectorAll('.topnav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(link.dataset.page);
    });
});

// --- Helpers ---
function getStatusCssClass(status) {
    const map = {
        'Por começar': 'status-por-comecar',
        'Em curso': 'status-em-curso',
        'Em espera': 'status-em-espera',
        'Finalizado': 'status-finalizado'
    };
    return map[status] || '';
}

function getIconClass(status, isOverdue) {
    if (isOverdue) return 'update-icon-overdue';
    const map = {
        'Por começar': 'update-icon-todo',
        'Em curso': 'update-icon-progress',
        'Em espera': 'update-icon-waiting',
        'Finalizado': 'update-icon-done'
    };
    return map[status] || 'update-icon-todo';
}

function getIconChar(status, isOverdue) {
    if (isOverdue) return '⚠';
    const map = { 'Por começar': '○', 'Em curso': '◈', 'Em espera': '◷', 'Finalizado': '✓' };
    return map[status] || '○';
}

function getTagClass(status, isOverdue) {
    if (isOverdue) return 'tag-overdue';
    const map = {
        'Por começar': 'tag-todo',
        'Em curso': 'tag-progress',
        'Em espera': 'tag-waiting',
        'Finalizado': 'tag-done'
    };
    return map[status] || 'tag-todo';
}

function getPriorityTagClass(priority) {
    const map = { 'Alta': 'tag-overdue', 'Média': 'tag-waiting', 'Baixa': 'tag-todo' };
    return map[priority] || 'tag-waiting';
}

function getTimeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (hours < 1) return 'AGORA';
    if (hours < 24) return `HÁ ${hours} HORA${hours > 1 ? 'S' : ''}`;
    if (days === 1) return 'ONTEM';
    if (days < 7) return `HÁ ${days} DIAS`;
    return `HÁ ${Math.floor(days / 7)} SEM.`;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// --- Modal: Create/Edit ---
function openModal(id) {
    const overlay = document.getElementById('modalOverlay');
    const form = document.getElementById('requestForm');
    form.reset();

    if (id) {
        const requests = loadRequests();
        const r = requests.find(req => req.id === id);
        if (r) {
            document.getElementById('modalTitle').textContent = 'Editar Pedido';
            document.getElementById('requestId').value = r.id;
            document.getElementById('title').value = r.title || '';
            document.getElementById('area').value = r.area || '';
            document.getElementById('status').value = r.status || 'Por começar';
            document.getElementById('priority').value = r.priority || 'Média';
            document.getElementById('deadline').value = r.deadline || '';
            document.getElementById('responsible').value = r.responsible || '';
            document.getElementById('team').value = r.team || '';
            document.getElementById('description').value = r.description || '';
            document.getElementById('nextStep').value = r.nextStep || '';
        }
    } else {
        document.getElementById('modalTitle').textContent = 'Novo Pedido';
        document.getElementById('requestId').value = '';
    }

    // Update datalists
    updateDataLists();
    overlay.classList.add('open');
    document.getElementById('title').focus();
}

function updateDataLists() {
    const requests = loadRequests();
    const areas = [...new Set(requests.map(r => r.area).filter(Boolean))].sort();
    const teams = [...new Set(requests.map(r => r.team).filter(Boolean))].sort();
    document.getElementById('areasList').innerHTML = areas.map(a => `<option value="${escapeHtml(a)}">`).join('');
    document.getElementById('teamsList').innerHTML = teams.map(t => `<option value="${escapeHtml(t)}">`).join('');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
}

function closeModalOutside(e) {
    if (e.target === e.currentTarget) closeModal();
}

function saveRequest(e) {
    e.preventDefault();
    const requests = loadRequests();
    const id = document.getElementById('requestId').value;
    const now = new Date().toISOString();

    const data = {
        title: document.getElementById('title').value.trim(),
        area: document.getElementById('area').value.trim(),
        status: document.getElementById('status').value,
        priority: document.getElementById('priority').value,
        deadline: document.getElementById('deadline').value,
        responsible: document.getElementById('responsible').value.trim(),
        team: document.getElementById('team').value.trim(),
        description: document.getElementById('description').value.trim(),
        nextStep: document.getElementById('nextStep').value.trim(),
        updatedAt: now
    };

    if (id) {
        const idx = requests.findIndex(r => r.id === id);
        if (idx !== -1) {
            requests[idx] = { ...requests[idx], ...data };
        }
    } else {
        data.id = generateId();
        data.createdAt = now;
        requests.push(data);
    }

    saveRequests(requests);
    closeModal();
    refresh();
}

// --- Modal: Detail View ---
function openDetail(id) {
    const requests = loadRequests();
    const r = requests.find(req => req.id === id);
    if (!r) return;

    currentDetailId = id;
    const today = new Date().toISOString().split('T')[0];
    const isOverdue = r.deadline && r.deadline < today && r.status !== 'Finalizado';

    document.getElementById('detailTitle').textContent = r.title;

    const tagClass = getTagClass(r.status, isOverdue);
    const rows = [
        { label: 'Estado', value: `<span class="tag tag-status ${tagClass}">${isOverdue ? 'ATRASADO' : escapeHtml(r.status.toUpperCase())}</span>` },
        { label: 'Área / Setor', value: escapeHtml(r.area) },
        { label: 'Prioridade', value: `<span class="tag tag-status ${getPriorityTagClass(r.priority)}">${escapeHtml((r.priority || 'Média').toUpperCase())}</span>` },
        { label: 'Responsável', value: escapeHtml(r.responsible) || '—' },
        { label: 'Equipa', value: escapeHtml(r.team) || '—' },
        { label: 'Data Limite', value: r.deadline ? formatDate(r.deadline) : '—' },
        { label: 'Descrição', value: escapeHtml(r.description) || '—' },
        { label: 'Próximo Passo', value: escapeHtml(r.nextStep) || '—' },
        { label: 'Atualizado', value: r.updatedAt ? new Date(r.updatedAt).toLocaleString('pt-PT') : '—' },
        { label: 'Criado', value: r.createdAt ? new Date(r.createdAt).toLocaleString('pt-PT') : '—' }
    ];

    document.getElementById('detailContent').innerHTML = rows.map(row =>
        `<div class="detail-row">
            <div class="detail-label">${row.label}</div>
            <div class="detail-value">${row.value}</div>
        </div>`
    ).join('');

    document.getElementById('detailOverlay').classList.add('open');
}

function closeDetail() {
    document.getElementById('detailOverlay').classList.remove('open');
    currentDetailId = null;
}

function closeDetailOutside(e) {
    if (e.target === e.currentTarget) closeDetail();
}

function editFromDetail() {
    const id = currentDetailId;
    closeDetail();
    openModal(id);
}

function deleteFromDetail() {
    if (!currentDetailId) return;
    if (!confirm('Tem a certeza que quer eliminar este pedido?')) return;

    let requests = loadRequests();
    requests = requests.filter(r => r.id !== currentDetailId);
    saveRequests(requests);
    closeDetail();
    refresh();
}

// --- Keyboard Shortcuts ---
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        closeDetail();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openModal();
    }
});

// --- Refresh ---
function refresh() {
    updateDashboard();
    updateSidebarAreaOptions();
    renderUpdates();
    if (currentPage === 'initiatives') renderInitiatives();
    if (currentPage === 'analytics') renderAnalytics();
}

// --- Sample Data ---
function loadSampleData() {
    const existing = loadRequests();
    if (existing.length > 0) return;

    const now = new Date();
    const h = (hoursAgo) => new Date(now.getTime() - hoursAgo * 3600000).toISOString();

    const samples = [
        {
            id: generateId(),
            title: 'Otimização de Supply Chain AI',
            area: 'Logística',
            description: 'Fase de integração de dados concluída. Iniciando treino do modelo preditivo para a área de Logística.',
            status: 'Em curso',
            priority: 'Alta',
            deadline: '2026-04-15',
            responsible: 'Ana Costa',
            team: 'Data & AI',
            nextStep: 'Validar modelo com dados de produção',
            createdAt: h(720),
            updatedAt: h(2)
        },
        {
            id: generateId(),
            title: 'Chatbot Apoio ao Cliente (GenAI)',
            area: 'Customer Success',
            description: 'Implementação finalizada com sucesso. Redução de 30% no tempo de resposta inicial reportado.',
            status: 'Finalizado',
            priority: 'Alta',
            deadline: '2026-02-28',
            responsible: 'Rui Almeida',
            team: 'Data & AI',
            nextStep: '',
            createdAt: h(2160),
            updatedAt: h(5)
        },
        {
            id: generateId(),
            title: 'Deteção de Fraude Real-time',
            area: 'Financeiro',
            description: 'Bloqueio na infraestrutura de cloud. Necessária revisão de permissões de segurança.',
            status: 'Em espera',
            priority: 'Alta',
            deadline: '2026-03-10',
            responsible: 'Luís Marques',
            team: 'Data Science',
            nextStep: 'Revisão de permissões com equipa de segurança',
            createdAt: h(1440),
            updatedAt: h(24)
        },
        {
            id: generateId(),
            title: 'Automação de Relatórios Financeiros',
            area: 'Finanças',
            description: 'Usar IA para gerar automaticamente relatórios mensais de despesas e receitas.',
            status: 'Por começar',
            priority: 'Média',
            deadline: '2026-05-01',
            responsible: 'Miguel Santos',
            team: 'Data & AI',
            nextStep: 'Reunião de levantamento com equipa de Finanças',
            createdAt: h(480),
            updatedAt: h(48)
        },
        {
            id: generateId(),
            title: 'Análise Preditiva de Vendas',
            area: 'Comercial',
            description: 'Modelo de previsão de vendas usando dados históricos para antecipar tendências.',
            status: 'Em curso',
            priority: 'Alta',
            deadline: '2026-03-30',
            responsible: 'Carla Mendes',
            team: 'Data Science',
            nextStep: 'Validar modelo com dados do último trimestre',
            createdAt: h(1200),
            updatedAt: h(12)
        },
        {
            id: generateId(),
            title: 'Dashboard Inteligente de KPIs',
            area: 'Direção Geral',
            description: 'Painel com insights gerados por IA sobre os principais indicadores de negócio.',
            status: 'Por começar',
            priority: 'Alta',
            deadline: '2026-03-10',
            responsible: 'Pedro Oliveira',
            team: 'Data & AI',
            nextStep: 'Definir KPIs prioritários com a Direção',
            createdAt: h(336),
            updatedAt: h(72)
        },
        {
            id: generateId(),
            title: 'Triagem Automática de CVs',
            area: 'Recursos Humanos',
            description: 'Ferramenta de IA para pré-selecionar candidaturas com base em critérios definidos.',
            status: 'Finalizado',
            priority: 'Média',
            deadline: '2026-02-28',
            responsible: 'Joana Ferreira',
            team: 'IT',
            nextStep: '',
            createdAt: h(2400),
            updatedAt: h(168)
        },
        {
            id: generateId(),
            title: 'Classificação Automática de Emails',
            area: 'Operações',
            description: 'Categorizar automaticamente emails recebidos para encaminhamento mais rápido.',
            status: 'Em espera',
            priority: 'Baixa',
            deadline: '2026-06-30',
            responsible: 'Sofia Rodrigues',
            team: 'IT',
            nextStep: 'Aguardar aprovação de orçamento',
            createdAt: h(600),
            updatedAt: h(240)
        },
        {
            id: generateId(),
            title: 'Assistente Virtual para Colaboradores',
            area: 'Recursos Humanos',
            description: 'Bot interno para responder a dúvidas sobre políticas de RH, férias e benefícios.',
            status: 'Por começar',
            priority: 'Média',
            deadline: '2026-07-15',
            responsible: '',
            team: '',
            nextStep: 'Identificar equipa e definir âmbito',
            createdAt: h(96),
            updatedAt: h(96)
        },
        {
            id: generateId(),
            title: 'Reconhecimento de Documentos (OCR)',
            area: 'Operações',
            description: 'Digitalização e extração automática de dados de faturas e contratos em papel.',
            status: 'Em curso',
            priority: 'Média',
            deadline: '2026-04-30',
            responsible: 'Tiago Neves',
            team: 'Data & AI',
            nextStep: 'Testar com amostra de 500 documentos',
            createdAt: h(500),
            updatedAt: h(6)
        }
    ];

    saveRequests(samples);
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    loadSampleData();
    refresh();
});
