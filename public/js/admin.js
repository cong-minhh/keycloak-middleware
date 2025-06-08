import authFetch from '../utils/authFetch.js';

// Show notification
function showNotification(message, type = 'success') {
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    $('.alert-container').append(alertHtml);
    setTimeout(() => {
        $('.alert').alert('close');
    }, 5000);
}

// Load data functions
// Admin functionality for user, role, and client management

// UI Elements
const loadingSpinners = {};
const errorStates = {};
const emptyStates = {};
const contentAreas = {};

// Initialize UI elements for each section
function initializeUIElements() {
    ['users', 'roles', 'clients', 'realms', 'sessions'].forEach(section => {
        loadingSpinners[section] = document.getElementById(`${section}-loading`);
        errorStates[section] = document.getElementById(`${section}-error`);
        emptyStates[section] = document.getElementById(`${section}-empty`);
        contentAreas[section] = document.getElementById(`${section}Content`);
    });
}

// Show/Hide UI States
function showUIState(section, state) {
    if (!loadingSpinners[section]) return;

    const states = ['loading', 'error', 'empty', 'content'];
    const elements = {
        loading: loadingSpinners[section],
        error: errorStates[section],
        empty: emptyStates[section],
        content: contentAreas[section]
    };

    states.forEach(s => {
        if (elements[s]) {
            elements[s].style.display = s === state ? 'block' : 'none';
        }
    });
}

// Show error message in section
function showSectionError(section, message) {
    if (errorStates[section]) {
        errorStates[section].querySelector('.error-message').textContent = message;
        showUIState(section, 'error');
    }
}

// Alert Functions
function showAlert(message, type = 'success') {
    const alertArea = document.getElementById('alertArea');
    if (!alertArea) return;

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertArea.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
}

// User Management
async function loadUsers() {
    // if (!hasRole('user-manager')) {
    //     showSectionError('users', 'Access Denied: You do not have permission to manage users');
    //     return;
    // }

    showUIState('users', 'loading');
    try {
        // console.log('Fetching users...');
        // const response = await fetch('/api/admin/users', {
        //     credentials: 'include'
        // });
        // if (!response.ok) throw new Error('Failed to fetch roles');
        // const users = await response.json();

        const { data } = await authFetch('/api/admin/users');

        if (data.length === 0) {
            showUIState('roles', 'empty');
            return;
        }
        console.log('Users:', data); // Add this line to log the users to the console

        // Update UI with user data
        const userList = document.getElementById('userList');
        if (userList) {
            userList.innerHTML = data.map(user => `
                <tr>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>${user.firstName} ${user.lastName}</td>
                    <td>
                        <span class="badge bg-${user.enabled ? 'success' : 'danger'}">
                            ${user.enabled ? 'Active' : 'Disabled'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-warning" onclick="resetPassword('${user.id}')">
                            Reset Password
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')">
                            Delete
                        </button>
                    </td>
                </tr>
            `).join('');
        }
        showUIState('users', 'content');
    } catch (error) {
        console.error('Error loading users:', error);
        showSectionError('users', error.message);
    }
}

// async function createUser(event) {
//     event.preventDefault();
//     const form = event.target;
//     const submitButton = form.querySelector('button[type="submit"]');
//     const originalText = submitButton.innerHTML;

//     submitButton.disabled = true;
//     submitButton.innerHTML = `
//         <span class="spinner-border spinner-border-sm"></span>
//         Creating...
//     `;

//     try {
//         const formData = new FormData(form);
//         const userData = Object.fromEntries(formData.entries());

//         const response = await fetch('/api/admin/users', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify(userData)
//         });

//         if (!response.ok) throw new Error('Failed to create user');

//         showAlert('User created successfully');
//         form.reset();
//         $('#createUserModal').modal('hide');
//         await loadUsers();
//     } catch (error) {
//         console.error('Error creating user:', error);
//         showAlert(error.message, 'danger');
//     } finally {
//         submitButton.disabled = false;
//         submitButton.innerHTML = originalText;
//     }
// }

// Role Management
async function loadRoles() {
    // if (!hasRole('role-manager')) {
    //     showSectionError('roles', 'Access Denied: You do not have permission to manage roles');
    //     return;
    // }

    showUIState('roles', 'loading');
    try {
        // const response = await fetch('/api/admin/roles', {
        //     credentials: 'include'
        // });
        // if (!response.ok) throw new Error('Failed to fetch roles');

        // const roles = await response.json();
        const { data } = await authFetch('/api/admin/roles');

        if (data.length === 0) {
            showUIState('roles', 'empty');
            return;
        }
        console.log('Roles:', data); // Add this line to log the roles to the console

        if (roles.length === 0) {
            showUIState('roles', 'empty');
            return;
        }

        const roleList = document.getElementById('roleList');
        if (roleList) {
            roleList.innerHTML = roles.map(role => `
                <tr>
                    <td>${role.name}</td>
                    <td>${role.description || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="deleteRole('${role.id}')">
                            Delete
                        </button>
                    </td>
                </tr>
            `).join('');
        }
        showUIState('roles', 'content');
    } catch (error) {
        console.error('Error loading roles:', error);
        showSectionError('roles', error.message);
    }
}

// async function createRole(event) {
//     event.preventDefault();
//     const form = event.target;
//     const submitButton = form.querySelector('button[type="submit"]');
//     const originalText = submitButton.innerHTML;

//     submitButton.disabled = true;
//     submitButton.innerHTML = `
//         <span class="spinner-border spinner-border-sm"></span>
//         Creating...
//     `;

//     try {
//         const formData = new FormData(form);
//         const roleData = Object.fromEntries(formData.entries());

//         const response = await fetch('/api/admin/roles', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify(roleData)
//         });

//         if (!response.ok) throw new Error('Failed to create role');

//         showAlert('Role created successfully');
//         form.reset();
//         $('#createRoleModal').modal('hide');
//         await loadRoles();
//     } catch (error) {
//         console.error('Error creating role:', error);
//         showAlert(error.message, 'danger');
//     } finally {
//         submitButton.disabled = false;
//         submitButton.innerHTML = originalText;
//     }
// }

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeUIElements();

    // Initialize forms
    const createUserForm = document.getElementById('createUserForm');
    if (createUserForm) {
        createUserForm.addEventListener('submit', createUser);
    }

    const createRoleForm = document.getElementById('createRoleForm');
    if (createRoleForm) {
        createRoleForm.addEventListener('submit', createRole);
    }

    // Load initial data if user has permissions
    // if (hasRole('user-manager'))
    loadUsers();
    // if (hasRole('role-manager')) 
    loadRoles();
});

// Modal show functions
function showCreateUserModal() {
    $('#createUserModal').modal('show');
}

function showCreateRoleModal() {
    $('#createRoleModal').modal('show');
}

function showCreateGroupModal() {
    $('#createGroupModal').modal('show');
}

function showCreateClientModal() {
    $('#createClientModal').modal('show');
}

// Create functions
async function createUser() {
    try {
        const formData = new FormData($('#createUserForm')[0]);
        const userData = Object.fromEntries(formData.entries());
        userData.enabled = formData.get('enabled') === 'on';

        const response = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        if (!response.ok) throw new Error('Failed to create user');

        $('#createUserModal').modal('hide');
        showNotification('User created successfully');
        loadUsers();
    } catch (error) {
        showNotification(error.message, 'danger');
    }
}

async function createRole() {
    try {
        const formData = new FormData($('#createRoleForm')[0]);
        const roleData = Object.fromEntries(formData.entries());

        const response = await fetch('/api/admin/roles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(roleData)
        });

        if (!response.ok) throw new Error('Failed to create role');

        $('#createRoleModal').modal('hide');
        showNotification('Role created successfully');
        loadRoles();
    } catch (error) {
        showNotification(error.message, 'danger');
    }
}

async function createGroup() {
    try {
        const formData = new FormData($('#createGroupForm')[0]);
        const groupData = Object.fromEntries(formData.entries());

        const response = await fetch('/api/admin/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(groupData)
        });

        if (!response.ok) throw new Error('Failed to create group');

        $('#createGroupModal').modal('hide');
        showNotification('Group created successfully');
        loadGroups();
    } catch (error) {
        showNotification(error.message, 'danger');
    }
}

async function createClient() {
    try {
        const formData = new FormData($('#createClientForm')[0]);
        const clientData = Object.fromEntries(formData.entries());
        clientData.enabled = formData.get('enabled') === 'on';

        const response = await fetch('/api/admin/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clientData)
        });

        if (!response.ok) throw new Error('Failed to create client');

        $('#createClientModal').modal('hide');
        showNotification('Client created successfully');
        loadClients();
    } catch (error) {
        showNotification(error.message, 'danger');
    }
}

// Delete functions
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete user');

        showNotification('User deleted successfully');
        loadUsers();
    } catch (error) {
        showNotification(error.message, 'danger');
    }
}

async function deleteRole(roleId) {
    if (!confirm('Are you sure you want to delete this role?')) return;

    try {
        const response = await fetch(`/api/admin/roles/${roleId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete role');

        showNotification('Role deleted successfully');
        loadRoles();
    } catch (error) {
        showNotification(error.message, 'danger');
    }
}

async function deleteGroup(groupId) {
    if (!confirm('Are you sure you want to delete this group?')) return;

    try {
        const response = await fetch(`/api/admin/groups/${groupId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete group');

        showNotification('Group deleted successfully');
        loadGroups();
    } catch (error) {
        showNotification(error.message, 'danger');
    }
}

async function deleteClient(clientId) {
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
        const response = await fetch(`/api/admin/clients/${clientId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete client');

        showNotification('Client deleted successfully');
        loadClients();
    } catch (error) {
        showNotification(error.message, 'danger');
    }
}

// Reset password function
async function resetPassword(userId) {
    const password = prompt('Enter new password:');
    if (!password) return;

    try {
        const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        console.log(response)
        if (!response.ok) throw new Error('Failed to reset password');

        showNotification('Password reset successfully');
    } catch (error) {
        showNotification(error.message, 'danger');
    }
}

// Load realm management data
async function loadRealms() {
    try {
        const [realmsResponse, configResponse] = await Promise.all([
            fetch('/api/admin/realms'),
            fetch('/api/admin/realm-config')
        ]);

        const realms = await realmsResponse.json();
        const config = await configResponse.json();

        // Update realms table
        const tbody = $('#realmsTableBody');
        tbody.empty();

        realms.forEach(realm => {
            tbody.append(`
                <tr>
                    <td>${realm.realm}</td>
                    <td>${realm.displayName || '-'}</td>
                    <td>
                        <span class="badge ${realm.enabled ? 'bg-success' : 'bg-danger'}">
                            ${realm.enabled ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                </tr>
            `);
        });

        // Update realm configuration
        $('#realmConfigContent').text(JSON.stringify(config, null, 2));
    } catch (error) {
        showNotification(error.message, 'danger');
    }
}

// Load user sessions
async function loadSessions() {
    try {
        const response = await fetch('/api/admin/users');
        const users = await response.json();
        const tbody = $('#sessionsTableBody');
        tbody.empty();

        for (const user of users) {
            try {
                const sessionsResponse = await fetch(`/api/admin/users/${user.id}/sessions`);
                const sessions = await sessionsResponse.json();

                sessions.forEach(session => {
                    tbody.append(`
                        <tr>
                            <td>${user.username}</td>
                            <td>${session.ipAddress || '-'}</td>
                            <td>${new Date(session.start).toLocaleString()}</td>
                            <td>${new Date(session.lastAccess).toLocaleString()}</td>
                            <td class="action-buttons">
                                <button class="btn btn-sm btn-danger" onclick="terminateSession('${user.id}')"><i class="bi bi-x-circle"></i></button>
                            </td>
                        </tr>
                    `);
                });
            } catch (error) {
                console.error(`Error loading sessions for user ${user.id}:`, error);
            }
        }
    } catch (error) {
        showNotification(error.message, 'danger');
    }
}

// Load security and monitoring data
async function loadSecurityData() {
    try {
        const eventsResponse = await fetch('/api/admin/events');
        const events = await eventsResponse.json();

        const tbody = $('#eventsTableBody');
        tbody.empty();

        events.forEach(event => {
            tbody.append(`
                <tr>
                    <td>${new Date(event.time).toLocaleString()}</td>
                    <td>${event.type}</td>
                    <td>${event.details || '-'}</td>
                </tr>
            `);
        });
    } catch (error) {
        showNotification(error.message, 'danger');
    }
}

// Load server information
async function loadServerInfo() {
    try {
        const response = await fetch('/api/admin/server-info');
        const serverInfo = await response.json();
        $('#serverInfoContent').text(JSON.stringify(serverInfo, null, 2));
    } catch (error) {
        showNotification(error.message, 'danger');
    }
}

// Session management functions
async function terminateSession(userId) {
    if (!confirm('Are you sure you want to terminate this user\'s sessions?')) return;

    try {
        const response = await fetch(`/api/admin/users/${userId}/sessions`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to terminate session');

        showNotification('Session terminated successfully');
        loadSessions();
    } catch (error) {
        showNotification(error.message, 'danger');
    }
}

// Security functions
async function clearBruteForce(userId) {
    try {
        const response = await fetch(`/api/admin/attack-detection/brute-force/users/${userId}/clear`, {
            method: 'POST'
        });

        if (!response.ok) throw new Error('Failed to clear brute force detection');

        showNotification('Brute force detection cleared successfully');
        loadSecurityData();
    } catch (error) {
        showNotification(error.message, 'danger');
    }
}

// Tab change event handlers
$('#adminTabs button').on('shown.bs.tab', function (e) {
    const target = $(e.target).attr('data-bs-target');
    switch (target) {
        case '#users':
            loadUsers();
            break;
        case '#roles':
            loadRoles();
            break;
        case '#groups':
            loadGroups();
            break;
        case '#clients':
            loadClients();
            break;
        case '#realms':
            loadRealms();
            break;
        case '#sessions':
            loadSessions();
            break;
        case '#security':
            loadSecurityData();
            break;
        case '#server-info':
            loadServerInfo();
            break;
    }
});

// Initial load
$(document).ready(() => {
    loadUsers();
});