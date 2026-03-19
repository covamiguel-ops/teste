// === Portal AI — Adoção de Inteligência Artificial ===

// --- Data Layer ---
const STORAGE_KEY = 'portal-ai-requests';
let currentView = 'cards';
let currentDetailId = null;

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
    const todo = requests.filter(r => r.status === 'Por começar').length;
    const progress = requests.filter(r => r.status === 'Em curso').length;
    const waiting = requests.filter(r => r.status === 'Em espera').length;
    const done = requests.filter(r => r.status === 'Finalizado').length;
    const overdue = requests.filter(r =>
        r.deadline && r.deadline < today && r.status !== 'Finalizado'
    ).length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-todo').textContent = todo;
    document.getElementById('stat-progress').textContent = progress;
    document.getElementById('stat-waiting').textContent = waiting;
    document.getElementById('stat-done').textContent = done;
    document.getElementById('stat-overdue').textContent = overdue;
}

// --- Dynamic Filter Options ---
function updateFilterOptions() {
    const requests = loadRequests();

    const areas = [...new Set(requests.map(r => r.area).filter(Boolean))].sort();
    const teams = [...new Set(requests.map(r => r.team).filter(Boolean))].sort();

    const filterArea = document.getElementById('filterArea');
    const filterTeam = document.getElementById('filterTeam');
    const areasList = document.getElementById('areasList');
    const teamsList = document.getElementById('teamsList');

    const currentArea = filterArea.value;
    const currentTeam = filterTeam.value;

    filterArea.innerHTML = '<option value="">Todas as áreas</option>' +
        areas.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
    filterTeam.innerHTML = '<option value="">Todas as equipas</option>' +
        teams.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');

    filterArea.value = currentArea;
    filterTeam.value = currentTeam;

    areasList.innerHTML = areas.map(a => `<option value="${escapeHtml(a)}">`).join('');
    teamsList.innerHTML = teams.map(t => `<option value="${escapeHtml(t)}">`).join('');
}

// --- Render List ---
function renderList() {
    const requests = loadRequests();
    const container = document.getElementById('requestList');
    const emptyState = document.getElementById('emptyState');

    const search = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('filterStatus').value;
    const areaFilter = document.getElementById('filterArea').value;
    const priorityFilter = document.getElementById('filterPriority').value;
    const teamFilter = document.getElementById('filterTeam').value;

    const today = new Date().toISOString().split('T')[0];

    let filtered = requests.filter(r => {
        if (search && !r.title.toLowerCase().includes(search) &&
            !(r.description || '').toLowerCase().includes(search) &&
            !(r.area || '').toLowerCase().includes(search)) return false;
        if (statusFilter && r.status !== statusFilter) return false;
        if (areaFilter && r.area !== areaFilter) return false;
        if (priorityFilter && r.priority !== priorityFilter) return false;
        if (teamFilter && r.team !== teamFilter) return false;
        return true;
    });

    // Sort: overdue first, then by priority (Alta > Média > Baixa), then by date
    const priorityOrder = { 'Alta': 0, 'Média': 1, 'Baixa': 2 };
    filtered.sort((a, b) => {
        const aOverdue = a.deadline && a.deadline < today && a.status !== 'Finalizado';
        const bOverdue = b.deadline && b.deadline < today && b.status !== 'Finalizado';
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        const aPri = priorityOrder[a.priority] ?? 1;
        const bPri = priorityOrder[b.priority] ?? 1;
        if (aPri !== bPri) return aPri - bPri;
        return (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '');
    });

    if (filtered.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    if (currentView === 'cards') {
        container.className = 'cards-view';
        container.innerHTML = filtered.map(r => renderCard(r, today)).join('');
    } else {
        container.className = 'table-view';
        container.innerHTML = renderTable(filtered, today);
    }
}

function renderCard(r, today) {
    const isOverdue = r.deadline && r.deadline < today && r.status !== 'Finalizado';
    const statusClass = getStatusClass(r.status);
    const statusBadge = getStatusBadgeClass(r.status);
    const priorityBadge = getPriorityBadgeClass(r.priority);

    return `
    <div class="request-card ${statusClass} ${isOverdue ? 'overdue' : ''}" onclick="openDetail('${r.id}')">
        <div class="card-header">
            <div class="card-title">${escapeHtml(r.title)}</div>
            <div class="card-badges">
                <span class="badge ${statusBadge}">${escapeHtml(r.status)}</span>
                ${isOverdue ? '<span class="badge badge-overdue">Atrasado</span>' : ''}
            </div>
        </div>
        ${r.description ? `<div class="card-description">${escapeHtml(r.description)}</div>` : ''}
        <div class="card-meta">
            ${r.area ? `<span class="card-meta-item"><span class="card-meta-icon">◈</span> ${escapeHtml(r.area)}</span>` : ''}
            ${r.priority ? `<span class="card-meta-item"><span class="badge ${priorityBadge}">${escapeHtml(r.priority)}</span></span>` : ''}
            ${r.responsible ? `<span class="card-meta-item"><span class="card-meta-icon">○</span> ${escapeHtml(r.responsible)}</span>` : ''}
            ${r.deadline ? `<span class="card-meta-item"><span class="card-meta-icon">◷</span> ${formatDate(r.deadline)}</span>` : ''}
        </div>
        ${r.nextStep ? `
        <div class="card-footer">
            <div class="card-next-step">
                <span>→</span>
                <strong>Próximo:</strong> ${escapeHtml(r.nextStep)}
            </div>
        </div>` : ''}
    </div>`;
}

function renderTable(requests, today) {
    const rows = requests.map(r => {
        const isOverdue = r.deadline && r.deadline < today && r.status !== 'Finalizado';
        return `<tr class="${isOverdue ? 'table-overdue' : ''}" onclick="openDetail('${r.id}')">
            <td class="table-title">${escapeHtml(r.title)}</td>
            <td>${escapeHtml(r.area || '—')}</td>
            <td><span class="badge ${getStatusBadgeClass(r.status)}">${escapeHtml(r.status)}</span>
                ${isOverdue ? ' <span class="badge badge-overdue">Atrasado</span>' : ''}</td>
            <td><span class="badge ${getPriorityBadgeClass(r.priority)}">${escapeHtml(r.priority || 'Média')}</span></td>
            <td>${escapeHtml(r.responsible || '—')}</td>
            <td>${r.deadline ? formatDate(r.deadline) : '—'}</td>
        </tr>`;
    }).join('');

    return `<table>
        <thead><tr>
            <th>Título</th><th>Área</th><th>Estado</th><th>Prioridade</th><th>Responsável</th><th>Data Limite</th>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table>`;
}

// --- Helpers ---
function getStatusClass(status) {
    const map = {
        'Por começar': 'status-por-comecar',
        'Em curso': 'status-em-curso',
        'Em espera': 'status-em-espera',
        'Finalizado': 'status-finalizado'
    };
    return map[status] || '';
}

function getStatusBadgeClass(status) {
    const map = {
        'Por começar': 'badge-todo',
        'Em curso': 'badge-progress',
        'Em espera': 'badge-waiting',
        'Finalizado': 'badge-done'
    };
    return map[status] || 'badge-todo';
}

function getPriorityBadgeClass(priority) {
    const map = { 'Alta': 'badge-high', 'Média': 'badge-medium', 'Baixa': 'badge-low' };
    return map[priority] || 'badge-medium';
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

// --- View Toggle ---
function setView(view) {
    currentView = view;
    document.getElementById('viewCards').classList.toggle('active', view === 'cards');
    document.getElementById('viewTable').classList.toggle('active', view === 'table');
    renderList();
}

// --- Filter Shortcuts ---
function filterByStatus(status) {
    document.getElementById('filterStatus').value = status || '';
    renderList();
}

function filterOverdue() {
    // Clear other filters and show only overdue
    clearFilters();
    // Custom render for overdue
    const requests = loadRequests();
    const today = new Date().toISOString().split('T')[0];
    const container = document.getElementById('requestList');
    const emptyState = document.getElementById('emptyState');

    const overdue = requests.filter(r =>
        r.deadline && r.deadline < today && r.status !== 'Finalizado'
    );

    if (overdue.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    if (currentView === 'cards') {
        container.className = 'cards-view';
        container.innerHTML = overdue.map(r => renderCard(r, today)).join('');
    } else {
        container.className = 'table-view';
        container.innerHTML = renderTable(overdue, today);
    }
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterArea').value = '';
    document.getElementById('filterPriority').value = '';
    document.getElementById('filterTeam').value = '';
    renderList();
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

    overlay.classList.add('open');
    document.getElementById('title').focus();
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

    const rows = [
        { label: 'Estado', value: `<span class="badge ${getStatusBadgeClass(r.status)}">${escapeHtml(r.status)}</span>${isOverdue ? ' <span class="badge badge-overdue">Atrasado</span>' : ''}` },
        { label: 'Área / Setor', value: escapeHtml(r.area) },
        { label: 'Prioridade', value: `<span class="badge ${getPriorityBadgeClass(r.priority)}">${escapeHtml(r.priority || 'Média')}</span>` },
        { label: 'Responsável', value: escapeHtml(r.responsible) || '—' },
        { label: 'Equipa', value: escapeHtml(r.team) || '—' },
        { label: 'Data Limite', value: r.deadline ? formatDate(r.deadline) : '—' },
        { label: 'Descrição', value: escapeHtml(r.description) || '—' },
        { label: 'Próximo Passo', value: escapeHtml(r.nextStep) || '—' },
        { label: 'Última Atualização', value: r.updatedAt ? new Date(r.updatedAt).toLocaleString('pt-PT') : '—' },
        { label: 'Criado em', value: r.createdAt ? new Date(r.createdAt).toLocaleString('pt-PT') : '—' }
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
    // Ctrl+N to create new
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openModal();
    }
});

// --- Refresh ---
function refresh() {
    updateDashboard();
    updateFilterOptions();
    renderList();
}

// --- Sample Data ---
function loadSampleData() {
    const existing = loadRequests();
    if (existing.length > 0) return;

    const samples = [
        {
            id: generateId(),
            title: 'Chatbot para Suporte ao Cliente',
            area: 'Apoio ao Cliente',
            description: 'Implementar um chatbot com IA para automatizar respostas a perguntas frequentes no site.',
            status: 'Em curso',
            priority: 'Alta',
            deadline: '2026-04-15',
            responsible: 'Ana Costa',
            team: 'Data & AI',
            nextStep: 'Integrar com a base de conhecimento existente',
            createdAt: '2026-02-10T09:00:00Z',
            updatedAt: '2026-03-15T14:30:00Z'
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
            nextStep: 'Reunião de levantamento com a equipa de Finanças',
            createdAt: '2026-03-01T10:00:00Z',
            updatedAt: '2026-03-01T10:00:00Z'
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
            createdAt: '2026-01-20T08:00:00Z',
            updatedAt: '2026-03-18T11:00:00Z'
        },
        {
            id: generateId(),
            title: 'Triagem Automática de CVs',
            area: 'Recursos Humanos',
            description: 'Ferramenta de IA para pré-selecionar candidaturas com base em critérios definidos.',
            status: 'Finalizado',
            priority: 'Média',
            deadline: '2026-02-28',
            responsible: 'Rui Almeida',
            team: 'Data & AI',
            nextStep: '',
            createdAt: '2025-12-15T09:00:00Z',
            updatedAt: '2026-02-25T16:00:00Z'
        },
        {
            id: generateId(),
            title: 'Classificação Automática de Emails',
            area: 'Operações',
            description: 'Categorizar automaticamente emails recebidos para encaminhamento mais rápido.',
            status: 'Em espera',
            priority: 'Baixa',
            deadline: '2026-06-30',
            responsible: 'Joana Ferreira',
            team: 'IT',
            nextStep: 'Aguardar aprovação de orçamento',
            createdAt: '2026-02-20T10:00:00Z',
            updatedAt: '2026-03-10T09:00:00Z'
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
            createdAt: '2026-03-05T08:00:00Z',
            updatedAt: '2026-03-05T08:00:00Z'
        },
        {
            id: generateId(),
            title: 'Deteção de Anomalias em Transações',
            area: 'Finanças',
            description: 'Sistema de alerta automático para transações financeiras fora do padrão.',
            status: 'Em curso',
            priority: 'Alta',
            deadline: '2026-04-30',
            responsible: 'Luís Marques',
            team: 'Data Science',
            nextStep: 'Testar modelo com dados de produção',
            createdAt: '2026-01-10T09:00:00Z',
            updatedAt: '2026-03-16T10:30:00Z'
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
            createdAt: '2026-03-15T09:00:00Z',
            updatedAt: '2026-03-15T09:00:00Z'
        }
    ];

    saveRequests(samples);
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    loadSampleData();
    refresh();
});
