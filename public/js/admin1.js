import authFetch from '../utils/authFetch';

// Unified notification helper
function notify(message, { type = 'success', timeout = 5000 } = {}) {
    const container = document.getElementById('alertArea') || document.querySelector('.alert-container');
    if (!container) return;

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    container.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), timeout);
}

// UIState manager for loading/error/empty/content
class UIState {
    constructor(sectionIds) {
        this.sections = {};
        this.states = ['loading', 'error', 'empty', 'content'];
        sectionIds.forEach(sec => {
            this.sections[sec] = {
                loading: document.getElementById(`${sec}-loading`),
                error: document.getElementById(`${sec}-error`),
                empty: document.getElementById(`${sec}-empty`),
                content: document.getElementById(`${sec}Content`)
            };
        });
    }

    show(section, state) {
        if (!this.sections[section]) return;
        this.states.forEach(s => {
            const el = this.sections[section][s];
            if (el) el.style.display = s === state ? 'block' : 'none';
        });
    }

    error(section, msg) {
        const errEl = this.sections[section].error;
        if (errEl) errEl.querySelector('.error-message').textContent = msg;
        this.show(section, 'error');
    }
}

const ui = new UIState(['users', 'roles', 'clients', 'realms', 'sessions', 'security', 'server-info']);

// Generic resource loader
async function loadResource({ section, url, render, fallbackEmpty = true }) {
    ui.show(section, 'loading');
    try {
        const res = await authFetch(url);
        const items = res.data;
        if (!items || items.length === 0) {
            if (fallbackEmpty) ui.show(section, 'empty');
            else notify('No data available', { type: 'info' });
            return;
        }
        render(items);
        ui.show(section, 'content');
    } catch (err) {
        console.error(`${section} loader error:`, err);
        ui.error(section, err.message);
    }
}

// Specific renderers
function renderUsers(users) {
    const tbody = document.getElementById('userList');
    tbody.innerHTML = users.map(u => `
    <tr>
      <td>${u.username}</td>
      <td>${u.email}</td>
      <td>${u.firstName} ${u.lastName}</td>
      <td><span class="badge bg-${u.enabled ? 'success' : 'danger'}">${u.enabled ? 'Active' : 'Disabled'}</span></td>
      <td>
        <button data-action="reset" data-section="users" data-id="${u.id}" class="btn btn-sm btn-warning">Reset</button>
        <button data-action="delete" data-section="users" data-id="${u.id}" class="btn btn-sm btn-danger">Delete</button>
      </td>
    </tr>
  `).join('');
}

function renderRoles(roles) {
    const tbody = document.getElementById('roleList');
    tbody.innerHTML = roles.map(r => `
    <tr>
      <td>${r.name}</td>
      <td>${r.description || '-'}</td>
      <td><button data-action="delete" data-section="roles" data-id="${r.id}" class="btn btn-sm btn-danger">Delete</button></td>
    </tr>`).join('');
}

function renderClients(clients) {
    const tbody = document.getElementById('clientList');
    tbody.innerHTML = clients.map(c => `
    <tr>
      <td>${c.clientId}</td>
      <td>${c.name || '-'}</td>
      <td><span class="badge bg-${c.enabled ? 'success' : 'danger'}">${c.enabled ? 'Active' : 'Disabled'}</span></td>
      <td><button data-action="delete" data-section="clients" data-id="${c.id}" class="btn btn-sm btn-danger">Delete</button></td>
    </tr>`).join('');
}

// Loaders for specialized endpoints
async function loadRealms() {
    ui.show('realms', 'loading');
    try {
        const [realmsRes, configRes] = await Promise.all([
            authFetch('/api/admin/realms'),
            authFetch('/api/admin/realm-config')
        ]);
        const realms = realmsRes.data;
        const config = configRes.data;

        const tbody = document.getElementById('realmsTableBody');
        tbody.innerHTML = realms.map(r => `
      <tr>
        <td>${r.realm}</td>
        <td>${r.displayName || '-'}</td>
        <td><span class="badge bg-${r.enabled ? 'success' : 'danger'}">${r.enabled ? 'Active' : 'Inactive'}</span></td>
      </tr>
    `).join('');

        document.getElementById('realmConfigContent').textContent = JSON.stringify(config, null, 2);
        ui.show('realms', 'content');
    } catch (err) {
        console.error('realms loader error:', err);
        ui.error('realms', err.message);
    }
}

async function loadSessions() {
    ui.show('sessions', 'loading');
    try {
        const { data: users } = await authFetch('/api/admin/users');
        const tbody = document.getElementById('sessionsTableBody');
        tbody.innerHTML = '';

        for (const u of users) {
            const { data: sessions } = await authFetch(`/api/admin/users/${u.id}/sessions`);
            sessions.forEach(s => {
                tbody.innerHTML += `
          <tr>
            <td>${u.username}</td>
            <td>${s.ipAddress || '-'}</td>
            <td>${new Date(s.start).toLocaleString()}</td>
            <td>${new Date(s.lastAccess).toLocaleString()}</td>
            <td><button data-action="terminate" data-section="sessions" data-id="${u.id}" class="btn btn-sm btn-danger">Terminate</button></td>
          </tr>`;
            });
        }
        ui.show('sessions', 'content');
    } catch (err) {
        console.error('sessions loader error:', err);
        ui.error('sessions', err.message);
    }
}

async function loadSecurity() {
    ui.show('security', 'loading');
    try {
        const { data: events } = await authFetch('/api/admin/events');
        const tbody = document.getElementById('eventsTableBody');
        tbody.innerHTML = events.map(e => `
      <tr>
        <td>${new Date(e.time).toLocaleString()}</td>
        <td>${e.type}</td>
        <td>${e.details || '-'}</td>
      </tr>
    `).join('');
        ui.show('security', 'content');
    } catch (err) {
        console.error('security loader error:', err);
        ui.error('security', err.message);
    }
}

async function loadServerInfo() {
    ui.show('server-info', 'loading');
    try {
        const { data: info } = await authFetch('/api/admin/server-info');
        document.getElementById('serverInfoContent').textContent = JSON.stringify(info, null, 2);
        ui.show('server-info', 'content');
    } catch (err) {
        console.error('server-info loader error:', err);
        ui.error('server-info', err.message);
    }
}

// Event delegation for button actions
document.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const section = btn.getAttribute('data-section');
    const id = btn.getAttribute('data-id');

    try {
        switch (action) {
            case 'delete':
                if (!confirm('Are you sure?')) return;
                await authFetch(`/api/admin/${section}/${id}`, { method: 'DELETE' });
                notify('Deleted successfully');
                reloadSection(section);
                break;
            case 'reset':
                const pwd = prompt('Enter new password:');
                if (!pwd) return;
                await authFetch(`/api/admin/users/${id}/reset-password`, { method: 'PUT', body: JSON.stringify({ password: pwd }) });
                notify('Password reset');
                break;
            case 'terminate':
                if (!confirm('Terminate session?')) return;
                await authFetch(`/api/admin/users/${id}/sessions`, { method: 'DELETE' });
                notify('Session terminated');
                loadSessions();
                break;
        }
    } catch (err) {
        notify(err.message, { type: 'danger' });
    }
});

// Reload helper
function reloadSection(section) {
    switch (section) {
        case 'users': loadUsers(); break;
        case 'roles': loadRoles(); break;
        case 'clients': loadClients(); break;
    }
}

// Loader bindings
const loadUsers = () => loadResource({ section: 'users', url: '/api/admin/users', render: renderUsers });
const loadRoles = () => loadResource({ section: 'roles', url: '/api/admin/roles', render: renderRoles });
const loadClients = () => loadResource({ section: 'clients', url: '/api/admin/clients', render: renderClients });

// Initialization
export default function initAdmin() {
    document.addEventListener('DOMContentLoaded', () => {
        loadUsers();
        loadRoles();
        loadClients();
        loadRealms();
        loadSessions();
        loadSecurity();
        loadServerInfo();

        // Tab change handling
        $('#adminTabs button').on('shown.bs.tab', function (e) {
            const target = $(e.target).attr('data-bs-target').substring(1);
            switch (target) {
                case 'users': loadUsers(); break;
                case 'roles': loadRoles(); break;
                case 'clients': loadClients(); break;
                case 'realms': loadRealms(); break;
                case 'sessions': loadSessions(); break;
                case 'security': loadSecurity(); break;
                case 'server-info': loadServerInfo(); break;
            }
        });
    });
}
