// Removed authFetch import - using fetch only

// Configuration
const CONFIG = {
    ALERT_TIMEOUT: 5000,
    CONFIRMATION_MESSAGES: {
        DELETE_USER: 'Are you sure you want to delete this user?',
        DELETE_ROLE: 'Are you sure you want to delete this role?',
        DELETE_GROUP: 'Are you sure you want to delete this group?',
        DELETE_CLIENT: 'Are you sure you want to delete this client?',
        TERMINATE_SESSION: 'Are you sure you want to terminate this user\'s sessions?'
    }
};

// UI Elements Management
const UIManager = {
    loadingSpinners: {},
    errorStates: {},
    emptyStates: {},
    contentAreas: {},

    initialize() {
        const sections = ['users', 'roles', 'groups', 'clients', 'realms', 'sessions'];
        sections.forEach(section => {
            this.loadingSpinners[section] = document.getElementById(`${section}-loading`);
            this.errorStates[section] = document.getElementById(`${section}-error`);
            this.emptyStates[section] = document.getElementById(`${section}-empty`);
            this.contentAreas[section] = document.getElementById(`${section}Content`);
        });
    },

    showState(section, state) {
        if (!this.loadingSpinners[section]) {
            console.warn(`UI elements for section '${section}' not found`);
            return;
        }

        const states = ['loading', 'error', 'empty', 'content'];
        const elements = {
            loading: this.loadingSpinners[section],
            error: this.errorStates[section],
            empty: this.emptyStates[section],
            content: this.contentAreas[section]
        };

        states.forEach(s => {
            if (elements[s]) {
                elements[s].style.display = s === state ? 'block' : 'none';
            }
        });
    },

    showError(section, message) {
        if (this.errorStates[section]) {
            const errorElement = this.errorStates[section].querySelector('.error-message');
            if (errorElement) {
                errorElement.textContent = message;
            }
            this.showState(section, 'error');
        }
    }
};

// Notification System
const NotificationManager = {
    show(message, type = 'success') {
        // Bootstrap alert method (legacy support)
        const alertContainer = document.querySelector('.alert-container');
        if (alertContainer) {
            const alertHtml = `
                <div class="alert alert-${type} alert-dismissible fade show">
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            alertContainer.insertAdjacentHTML('beforeend', alertHtml);
            setTimeout(() => {
                const alerts = alertContainer.querySelectorAll('.alert');
                alerts.forEach(alert => {
                    if (alert.querySelector('.btn-close')) {
                        alert.remove();
                    }
                });
            }, CONFIG.ALERT_TIMEOUT);
            return;
        }

        // Standard alert method
        const alertArea = document.getElementById('alertArea');
        if (!alertArea) {
            console.warn('No alert area found, falling back to console');
            console.log(`${type.toUpperCase()}: ${message}`);
            return;
        }

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        alertArea.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), CONFIG.ALERT_TIMEOUT);
    }
};

// API Helper
const APIHelper = {
    async handleResponse(response) {
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `HTTP Error: ${response.status}`);
        }
        return response.json();
    },

    async get(endpoint) {
        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            return this.handleResponse(response);
        } catch (error) {
            console.error(`GET ${endpoint} failed:`, error);
            throw error;
        }
    },

    async post(endpoint, data) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });
            return this.handleResponse(response);
        } catch (error) {
            console.error(`POST ${endpoint} failed:`, error);
            throw error;
        }
    },

    async put(endpoint, data) {
        try {
            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });
            return this.handleResponse(response);
        } catch (error) {
            console.error(`PUT ${endpoint} failed:`, error);
            throw error;
        }
    },

    async delete(endpoint) {
        try {
            const response = await fetch(endpoint, {
                method: 'DELETE',
                credentials: 'include'
            });
            return this.handleResponse(response);
        } catch (error) {
            console.error(`DELETE ${endpoint} failed:`, error);
            throw error;
        }
    }
};

// User Management
class UserManager {
    static selectedUsers = new Set();
    static allUsers = [];

    static async loadUsers() {
        try {
            document.getElementById('userList').innerHTML = `
                <tr><td colspan="7" class="text-center py-4">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </td></tr>
            `;

            const result = await APIHelper.get('/api/users');

            if (result.success) {
                this.allUsers = result.data;
                this.renderUsers(result.data);
                document.getElementById('userCount').textContent = result.count;
            } else {
                throw new Error('Failed to load users');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            document.getElementById('userList').innerHTML = `
                <tr><td colspan="7" class="text-center text-danger py-4">
                    Error loading users: ${error.message}
                </td></tr>
            `;
        }
    }

    static renderUsers(users) {
        const userList = document.getElementById('userList');
        userList.innerHTML = users.map(user => `
            <tr>
                <td>
                    <input type="checkbox" class="user-select" value="${user.id}" 
                           onchange="UserManager.updateSelection()">
                </td>
                <td>${this.escapeHtml(user.username || 'N/A')}</td>
                <td>${this.escapeHtml(user.email || 'N/A')}</td>
                <td>${this.escapeHtml(`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A')}</td>
                <td>
                    <span class="badge bg-${user.enabled ? 'success' : 'danger'}">
                        ${user.enabled ? 'Active' : 'Disabled'}
                    </span>
                </td>
                <td class="user-roles">
                    <button class="btn btn-sm btn-outline-info" onclick="UserManager.manageRoles('${user.id}')" title="Manage Roles">
                        <i class="bi bi-shield-check"></i> Roles
                    </button>
                </td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="UserManager.editUser('${user.id}')" title="Edit User">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-${user.enabled ? 'warning' : 'success'} me-1" 
                            onclick="UserManager.toggleStatus('${user.id}', ${!user.enabled})" 
                            title="${user.enabled ? 'Disable' : 'Enable'} User">
                        <i class="bi bi-${user.enabled ? 'pause' : 'play'}"></i>
                    </button>
                    <button class="btn btn-sm btn-warning me-1" onclick="UserManager.resetPassword('${user.id}')" title="Reset Password">
                        <i class="bi bi-key"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="UserManager.deleteUser('${user.id}')" title="Delete User">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    static updateSelection() {
        const checkboxes = document.querySelectorAll('.user-select');
        this.selectedUsers.clear();

        checkboxes.forEach(cb => {
            if (cb.checked) {
                this.selectedUsers.add(cb.value);
            }
        });

        const bulkActions = document.getElementById('bulkActions');
        const selectionCount = document.getElementById('selectionCount');

        if (this.selectedUsers.size > 0) {
            bulkActions.style.display = 'block';
            selectionCount.textContent = `${this.selectedUsers.size} users selected`;
        } else {
            bulkActions.style.display = 'none';
        }

        // Update select all checkbox
        const selectAll = document.getElementById('selectAll');
        selectAll.indeterminate = this.selectedUsers.size > 0 && this.selectedUsers.size < checkboxes.length;
        selectAll.checked = this.selectedUsers.size === checkboxes.length;
    }

    static toggleSelectAll() {
        const selectAll = document.getElementById('selectAll');
        const checkboxes = document.querySelectorAll('.user-select');

        checkboxes.forEach(cb => {
            cb.checked = selectAll.checked;
        });

        this.updateSelection();
    }

    static clearSelection() {
        document.querySelectorAll('.user-select').forEach(cb => cb.checked = false);
        document.getElementById('selectAll').checked = false;
        this.updateSelection();
    }

    static async createUser(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            enabled: formData.has('enabled')
        };

        try {
            const result = await APIHelper.post('/api/users', userData);

            if (result.success) {
                bootstrap.Modal.getInstance(document.getElementById('createUserModal')).hide();
                form.reset();
                this.loadUsers();
                this.showAlert('User created successfully', 'success');
            } else {
                throw new Error(result.message || 'Failed to create user');
            }
        } catch (error) {
            this.showAlert('Error creating user: ' + error.message, 'danger');
        }
    }

    static async editUser(userId) {
        try {
            const result = await APIHelper.get(`/api/users/${userId}`);

            if (result.success) {
                const user = result.data;
                const form = document.getElementById('editUserForm');
                form.userId.value = userId;
                form.email.value = user.email || '';
                form.firstName.value = user.firstName || '';
                form.lastName.value = user.lastName || '';
                form.enabled.checked = user.enabled;

                new bootstrap.Modal(document.getElementById('editUserModal')).show();
            }
        } catch (error) {
            this.showAlert('Error loading user data: ' + error.message, 'danger');
        }
    }

    static async updateUser(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const userId = formData.get('userId');

        const userData = {
            email: formData.get('email'),
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            enabled: formData.has('enabled')
        };

        try {
            const result = await APIHelper.put(`/api/users/${userId}`, userData);

            if (result.success) {
                bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
                this.loadUsers();
                this.showAlert('User updated successfully', 'success');
            } else {
                throw new Error(result.message || 'Failed to update user');
            }
        } catch (error) {
            this.showAlert('Error updating user: ' + error.message, 'danger');
        }
    }

    static async toggleStatus(userId, enabled) {
        try {
            // Using a custom fetch for PATCH since APIHelper doesn't have a patch method
            const response = await fetch(`/api/users/${userId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ enabled })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || `HTTP Error: ${response.status}`);
            }

            if (result.success) {
                this.loadUsers();
                this.showAlert(result.message, 'success');
            } else {
                throw new Error(result.message || 'Failed to update user status');
            }
        } catch (error) {
            this.showAlert('Error updating user status: ' + error.message, 'danger');
        }
    }

    static resetPassword(userId) {
        document.getElementById('resetPasswordForm').userId.value = userId;
        new bootstrap.Modal(document.getElementById('resetPasswordModal')).show();
    }

    static async submitPasswordReset(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const userId = formData.get('userId');

        const resetData = {
            password: formData.get('password'),
            temporary: formData.has('temporary')
        };

        try {
            const result = await APIHelper.put(`/api/users/${userId}/reset-password`, resetData);

            if (result.success) {
                bootstrap.Modal.getInstance(document.getElementById('resetPasswordModal')).hide();
                form.reset();
                this.showAlert('Password reset successfully', 'success');
            } else {
                throw new Error(result.message || 'Failed to reset password');
            }
        } catch (error) {
            this.showAlert('Error resetting password: ' + error.message, 'danger');
        }
    }

    static async manageRoles(userId) {
        document.getElementById('roleUserId').value = userId;
        const modal = new bootstrap.Modal(document.getElementById('manageRolesModal'));
        modal.show();

        try {
            const result = await APIHelper.get(`/api/users/${userId}/roles`);

            if (result.success) {
                this.displayRoles(result.data);
            }
        } catch (error) {
            document.getElementById('currentRoles').innerHTML =
                `<div class="text-danger">Error loading roles: ${error.message}</div>`;
        }
    }

    static displayRoles(roles) {
        const container = document.getElementById('currentRoles');
        if (roles.length === 0) {
            container.innerHTML = '<div class="text-muted">No roles assigned</div>';
        } else {
            container.innerHTML = roles.map(role => `
                <span class="badge bg-primary role-tag">
                    ${this.escapeHtml(role)}
                    <button type="button" class="btn-close btn-close-white ms-1" 
                            onclick="UserManager.removeRole('${role}')" 
                            aria-label="Remove role"></button>
                </span>
            `).join('');
        }
    }

    static async addRole() {
        const userId = document.getElementById('roleUserId').value;
        const roleInput = document.getElementById('newRoleInput');
        const roleName = roleInput.value.trim();

        if (!roleName) return;

        try {
            const result = await APIHelper.post(`/api/users/${userId}/roles`, { roles: [roleName] });

            if (result.success) {
                roleInput.value = '';
                this.manageRoles(userId); // Refresh roles display
                this.showAlert('Role added successfully', 'success');
            } else {
                throw new Error(result.message || 'Failed to add role');
            }
        } catch (error) {
            this.showAlert('Error adding role: ' + error.message, 'danger');
        }
    }

    static async removeRole(roleName) {
        const userId = document.getElementById('roleUserId').value;

        try {
            // Using a custom fetch for DELETE with body since APIHelper.delete doesn't accept body
            const response = await fetch(`/api/users/${userId}/roles`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ roles: [roleName] })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || `HTTP Error: ${response.status}`);
            }

            if (result.success) {
                this.manageRoles(userId); // Refresh roles display
                this.showAlert('Role removed successfully', 'success');
            } else {
                throw new Error(result.message || 'Failed to remove role');
            }
        } catch (error) {
            this.showAlert('Error removing role: ' + error.message, 'danger');
        }
    }

    static async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            const result = await APIHelper.delete(`/api/users/${userId}`);

            if (result.success) {
                this.loadUsers();
                this.showAlert('User deleted successfully', 'success');
            } else {
                throw new Error(result.message || 'Failed to delete user');
            }
        } catch (error) {
            this.showAlert('Error deleting user: ' + error.message, 'danger');
        }
    }

    static async bulkDelete() {
        if (this.selectedUsers.size === 0) return;

        if (!confirm(`Are you sure you want to delete ${this.selectedUsers.size} selected users?`)) return;

        try {
            const result = await APIHelper.post('/api/users/bulk/delete', {
                userIds: Array.from(this.selectedUsers)
            });

            if (result.success) {
                this.clearSelection();
                this.loadUsers();
                this.showAlert('Users deleted successfully', 'success');
            } else {
                throw new Error(result.message || 'Failed to delete users');
            }
        } catch (error) {
            this.showAlert('Error deleting users: ' + error.message, 'danger');
        }
    }

    static showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show custom-alert`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alertDiv);

        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Role Management
class RoleManager {
    static async load() {
        UIManager.showState('roles', 'loading');
        try {
            const roles = await APIHelper.get('/api/admin/roles');

            if (!roles || roles.length === 0) {
                UIManager.showState('roles', 'empty');
                return;
            }

            console.log('Roles loaded:', roles);
            this.renderRoles(roles);
            UIManager.showState('roles', 'content');
        } catch (error) {
            console.error('Error loading roles:', error);
            UIManager.showError('roles', error.message);
        }
    }

    static renderRoles(roles) {
        const roleList = document.getElementById('roleList');
        if (!roleList) {
            console.warn('Role list element not found');
            return;
        }

        roleList.innerHTML = roles.map(role => `
            <tr>
                <td>${UserManager.escapeHtml(role.name || 'N/A')}</td>
                <td>${UserManager.escapeHtml(role.description || '-')}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="RoleManager.delete('${role.id}')" title="Delete Role">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }

    static async create() {
        try {
            const form = document.getElementById('createRoleForm');
            if (!form) throw new Error('Create role form not found');

            const formData = new FormData(form);
            const roleData = Object.fromEntries(formData.entries());

            await APIHelper.post('/api/admin/roles', roleData);

            UserManager.hideModal('createRoleModal');
            NotificationManager.show('Role created successfully');
            form.reset();
            await this.load();
        } catch (error) {
            console.error('Error creating role:', error);
            NotificationManager.show(error.message, 'danger');
        }
    }

    static async delete(roleId) {
        if (!confirm(CONFIG.CONFIRMATION_MESSAGES.DELETE_ROLE)) return;

        try {
            await APIHelper.delete(`/api/admin/roles/${roleId}`);
            NotificationManager.show('Role deleted successfully');
            await this.load();
        } catch (error) {
            console.error('Error deleting role:', error);
            NotificationManager.show(error.message, 'danger');
        }
    }

    static showCreateModal() {
        UserManager.showModal('createRoleModal');
    }
}

// Group Management
class GroupManager {
    static async load() {
        UIManager.showState('groups', 'loading');
        try {
            const groups = await APIHelper.get('/api/admin/groups');

            if (!groups || groups.length === 0) {
                UIManager.showState('groups', 'empty');
                return;
            }

            console.log('Groups loaded:', groups);
            this.renderGroups(groups);
            UIManager.showState('groups', 'content');
        } catch (error) {
            console.error('Error loading groups:', error);
            UIManager.showError('groups', error.message);
        }
    }

    static renderGroups(groups) {
        const groupList = document.getElementById('groupList');
        if (!groupList) {
            console.warn('Group list element not found');
            return;
        }

        groupList.innerHTML = groups.map(group => `
            <tr>
                <td>${UserManager.escapeHtml(group.name || 'N/A')}</td>
                <td>${UserManager.escapeHtml(group.path || 'N/A')}</td>
                <td>${group.subGroupCount || 0}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="GroupManager.delete('${group.id}')" title="Delete Group">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }

    static async create() {
        try {
            const form = document.getElementById('createGroupForm');
            if (!form) throw new Error('Create group form not found');

            const formData = new FormData(form);
            const groupData = Object.fromEntries(formData.entries());

            await APIHelper.post('/api/admin/groups', groupData);

            UserManager.hideModal('createGroupModal');
            NotificationManager.show('Group created successfully');
            form.reset();
            await this.load();
        } catch (error) {
            console.error('Error creating group:', error);
            NotificationManager.show(error.message, 'danger');
        }
    }

    static async delete(groupId) {
        if (!confirm(CONFIG.CONFIRMATION_MESSAGES.DELETE_GROUP)) return;

        try {
            await APIHelper.delete(`/api/admin/groups/${groupId}`);
            NotificationManager.show('Group deleted successfully');
            await this.load();
        } catch (error) {
            console.error('Error deleting group:', error);
            NotificationManager.show(error.message, 'danger');
        }
    }

    static showCreateModal() {
        UserManager.showModal('createGroupModal');
    }
}

// Client Management
class ClientManager {
    static async load() {
        UIManager.showState('clients', 'loading');
        try {
            const clients = await APIHelper.get('/api/admin/clients');

            if (!clients || clients.length === 0) {
                UIManager.showState('clients', 'empty');
                return;
            }

            console.log('Clients loaded:', clients);
            this.renderClients(clients);
            UIManager.showState('clients', 'content');
        } catch (error) {
            console.error('Error loading clients:', error);
            UIManager.showError('clients', error.message);
        }
    }

    static renderClients(clients) {
        const clientList = document.getElementById('clientList');
        if (!clientList) {
            console.warn('Client list element not found');
            return;
        }

        clientList.innerHTML = clients.map(client => `
            <tr>
                <td>${UserManager.escapeHtml(client.clientId || 'N/A')}</td>
                <td>${UserManager.escapeHtml(client.name || 'N/A')}</td>
                <td>${UserManager.escapeHtml(client.protocol || 'N/A')}</td>
                <td>
                    <span class="badge bg-${client.enabled ? 'success' : 'danger'}">
                        ${client.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="ClientManager.delete('${client.id}')" title="Delete Client">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }

    static async create() {
        try {
            const form = document.getElementById('createClientForm');
            if (!form) throw new Error('Create client form not found');

            const formData = new FormData(form);
            const clientData = Object.fromEntries(formData.entries());
            clientData.enabled = formData.get('enabled') === 'on';

            await APIHelper.post('/api/admin/clients', clientData);

            UserManager.hideModal('createClientModal');
            NotificationManager.show('Client created successfully');
            form.reset();
            await this.load();
        } catch (error) {
            console.error('Error creating client:', error);
            NotificationManager.show(error.message, 'danger');
        }
    }

    static async delete(clientId) {
        if (!confirm(CONFIG.CONFIRMATION_MESSAGES.DELETE_CLIENT)) return;

        try {
            await APIHelper.delete(`/api/admin/clients/${clientId}`);
            NotificationManager.show('Client deleted successfully');
            await this.load();
        } catch (error) {
            console.error('Error deleting client:', error);
            NotificationManager.show(error.message, 'danger');
        }
    }

    static showCreateModal() {
        UserManager.showModal('createClientModal');
    }
}

// Realm Management
class RealmManager {
    static async load() {
        UIManager.showState('realms', 'loading');
        try {
            const [realms, config] = await Promise.all([
                APIHelper.get('/api/admin/realms'),
                APIHelper.get('/api/admin/realm-config')
            ]);

            console.log('Realms loaded:', realms);
            this.renderRealms(realms);
            this.renderConfig(config);
            UIManager.showState('realms', 'content');
        } catch (error) {
            console.error('Error loading realms:', error);
            UIManager.showError('realms', error.message);
        }
    }

    static renderRealms(realms) {
        const tbody = document.getElementById('realmsTableBody');
        if (!tbody) {
            console.warn('Realms table body not found');
            return;
        }

        tbody.innerHTML = realms.map(realm => `
            <tr>
                <td>${UserManager.escapeHtml(realm.realm || 'N/A')}</td>
                <td>${UserManager.escapeHtml(realm.displayName || '-')}</td>
                <td>
                    <span class="badge bg-${realm.enabled ? 'success' : 'danger'}">
                        ${realm.enabled ? 'Active' : 'Inactive'}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    static renderConfig(config) {
        const configElement = document.getElementById('realmConfigContent');
        if (configElement) {
            configElement.textContent = JSON.stringify(config, null, 2);
        }
    }
}

// Session Management
class SessionManager {
    static async load() {
        UIManager.showState('sessions', 'loading');
        try {
            const users = await APIHelper.get('/api/admin/users');
            const allSessions = [];

            for (const user of users.data) {
                try {
                    const sessions = await APIHelper.get(`/api/admin/users/${user.id}/sessions`);
                    sessions.forEach(session => {
                        allSessions.push({ ...session, user });
                    });
                } catch (error) {
                    console.error(`Error loading sessions for user ${user.id}:`, error);
                }
            }

            console.log('Sessions loaded:', allSessions);
            this.renderSessions(allSessions);
            UIManager.showState('sessions', 'content');
        } catch (error) {
            console.error('Error loading sessions:', error);
            UIManager.showError('sessions', error.message);
        }
    }

    static renderSessions(sessions) {
        const tbody = document.getElementById('sessionsTableBody');
        if (!tbody) {
            console.warn('Sessions table body not found');
            return;
        }

        tbody.innerHTML = sessions.map(session => `
            <tr>
                <td>${UserManager.escapeHtml(session.user.username || 'N/A')}</td>
                <td>${UserManager.escapeHtml(session.ipAddress || '-')}</td>
                <td>${session.start ? new Date(session.start).toLocaleString() : 'N/A'}</td>
                <td>${session.lastAccess ? new Date(session.lastAccess).toLocaleString() : 'N/A'}</td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-danger" onclick="SessionManager.terminate('${session.user.id}')" title="Terminate Session">
                        <i class="bi bi-x-circle"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    static async terminate(userId) {
        if (!confirm(CONFIG.CONFIRMATION_MESSAGES.TERMINATE_SESSION)) return;

        try {
            await APIHelper.delete(`/api/admin/users/${userId}/sessions`);
            NotificationManager.show('Session terminated successfully');
            await this.load();
        } catch (error) {
            console.error('Error terminating session:', error);
            NotificationManager.show(error.message, 'danger');
        }
    }
}

// Security Management
class SecurityManager {
    static async load() {
        UIManager.showState('security', 'loading');
        try {
            const events = await APIHelper.get('/api/admin/events');

            console.log('Security events loaded:', events);
            this.renderEvents(events);
            UIManager.showState('security', 'content');
        } catch (error) {
            console.error('Error loading security data:', error);
            UIManager.showError('security', error.message);
        }
    }

    static renderEvents(events) {
        const tbody = document.getElementById('eventsTableBody');
        if (!tbody) {
            console.warn('Events table body not found');
            return;
        }

        tbody.innerHTML = events.map(event => `
            <tr>
                <td>${event.time ? new Date(event.time).toLocaleString() : 'N/A'}</td>
                <td>${UserManager.escapeHtml(event.type || 'N/A')}</td>
                <td>${UserManager.escapeHtml(event.details || '-')}</td>
            </tr>
        `).join('');
    }

    static async clearBruteForce(userId) {
        try {
            await APIHelper.post(`/api/admin/attack-detection/brute-force/users/${userId}/clear`);
            NotificationManager.show('Brute force detection cleared successfully');
            await this.load();
        } catch (error) {
            console.error('Error clearing brute force detection:', error);
            NotificationManager.show(error.message, 'danger');
        }
    }
}

// Server Information
class ServerInfoManager {
    static async load() {
        try {
            const serverInfo = await APIHelper.get('/api/admin/server-info');
            console.log('Server info loaded:', serverInfo);

            const serverInfoElement = document.getElementById('serverInfoContent');
            if (serverInfoElement) {
                serverInfoElement.textContent = JSON.stringify(serverInfo, null, 2);
            }
        } catch (error) {
            console.error('Error loading server info:', error);
            NotificationManager.show(error.message, 'danger');
        }
    }
}

// Tab Management
class TabManager {
    static initialize() {
        const tabButtons = document.querySelectorAll('#adminTabs button[data-bs-target]');
        tabButtons.forEach(button => {
            button.addEventListener('shown.bs.tab', (e) => {
                const target = e.target.getAttribute('data-bs-target');
                this.handleTabChange(target);
            });
        });

        // Support for jQuery if available
        if (window.$) {
            $('#adminTabs button').on('shown.bs.tab', (e) => {
                const target = $(e.target).attr('data-bs-target');
                this.handleTabChange(target);
            });
        }
    }

    static handleTabChange(target) {
        switch (target) {
            case '#users':
                UserManager.load();
                break;
            case '#roles':
                RoleManager.load();
                break;
            case '#groups':
                GroupManager.load();
                break;
            case '#clients':
                ClientManager.load();
                break;
            case '#realms':
                RealmManager.load();
                break;
            case '#sessions':
                SessionManager.load();
                break;
            case '#security':
                SecurityManager.load();
                break;
            case '#server-info':
                ServerInfoManager.load();
                break;
            default:
                console.warn(`Unknown tab target: ${target}`);
        }
    }
}

// Global Functions (for backward compatibility)
window.showCreateUserModal = () => UserManager.showCreateModal();
window.showCreateRoleModal = () => RoleManager.showCreateModal();
window.showCreateGroupModal = () => GroupManager.showCreateModal();
window.showCreateClientModal = () => ClientManager.showCreateModal();

window.createUser = () => UserManager.create();
window.createRole = () => RoleManager.create();
window.createGroup = () => GroupManager.create();
window.createClient = () => ClientManager.create();

window.deleteUser = (id) => UserManager.delete(id);
window.deleteRole = (id) => RoleManager.delete(id);
window.deleteGroup = (id) => GroupManager.delete(id);
window.deleteClient = (id) => ClientManager.delete(id);

window.resetPassword = (id) => UserManager.resetPassword(id);
window.terminateSession = (id) => SessionManager.terminate(id);
window.clearBruteForce = (id) => SecurityManager.clearBruteForce(id);

window.loadUsers = () => UserManager.load();
window.loadRoles = () => RoleManager.load();
window.loadGroups = () => GroupManager.load();
window.loadClients = () => ClientManager.load();
window.loadRealms = () => RealmManager.load();
window.loadSessions = () => SessionManager.load();
window.loadSecurityData = () => SecurityManager.load();
window.loadServerInfo = () => ServerInfoManager.load();

// Legacy notification functions
window.showNotification = (message, type) => NotificationManager.show(message, type);
window.showAlert = (message, type) => NotificationManager.show(message, type);

// Application Initialization
class AdminApp {
    static initialize() {
        console.log('Initializing Admin Application...');

        // Initialize UI elements
        UIManager.initialize();

        // Initialize tab management
        TabManager.initialize();

        // Initialize form event listeners
        this.initializeFormListeners();

        // Load initial data
        this.loadInitialData();

        console.log('Admin Application initialized successfully');
    }

    static initializeFormListeners() {
        // User form
        const createUserForm = document.getElementById('createUserForm');
        if (createUserForm) {
            createUserForm.addEventListener('submit', (e) => {
                e.preventDefault();
                UserManager.create();
            });
        }

        // Role form
        const createRoleForm = document.getElementById('createRoleForm');
        if (createRoleForm) {
            createRoleForm.addEventListener('submit', (e) => {
                e.preventDefault();
                RoleManager.create();
            });
        }

        // Group form
        const createGroupForm = document.getElementById('createGroupForm');
        if (createGroupForm) {
            createGroupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                GroupManager.create();
            });
        }

        // Client form
        const createClientForm = document.getElementById('createClientForm');
        if (createClientForm) {
            createClientForm.addEventListener('submit', (e) => {
                e.preventDefault();
                ClientManager.create();
            });
        }
    }

    static loadInitialData() {
        // Load users by default
        UserManager.load();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AdminApp.initialize());
} else {
    AdminApp.initialize();
}

// jQuery ready support
if (window.$) {
    $(document).ready(() => AdminApp.initialize());
}