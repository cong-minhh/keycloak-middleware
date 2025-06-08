// RBAC (Role-Based Access Control) functionality
let userRoles = [];
let initialized = false;

// Initialize RBAC
async function init() {
    if (initialized) return;

    try {
        const response = await fetch('/api/users/roles', {
            credentials: 'include'
        });

        if (response.status === 401 || response.status === 403) {
            // User is not authenticated, show login button
            document.getElementById('logoutBtn').style.display = 'none';
            const loginBtn = document.createElement('a');
            loginBtn.href = '/';
            loginBtn.className = 'btn btn-primary';
            loginBtn.textContent = 'Login';
            document.getElementById('logoutBtn').parentNode.appendChild(loginBtn);
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to fetch user roles');
        }

        const data = await response.json();
        userRoles = data.roles || [];

        // Apply access control to UI sections
        applyAccessControl();
        document.getElementById('logoutBtn').style.display = 'block';

        initialized = true;
    } catch (error) {
        console.error('Error initializing RBAC:', error);
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            // Show login button if there's a network error or failed fetch
            document.getElementById('logoutBtn').style.display = 'none';
            const loginBtn = document.createElement('a');
            loginBtn.href = '/';
            loginBtn.className = 'btn btn-primary';
            loginBtn.textContent = 'Login';
            document.getElementById('logoutBtn').parentNode.appendChild(loginBtn);
        } else {
            showGlobalAccessDenied('Failed to load user permissions. Please try again later.');
        }
    }
}

// Check if user has a specific role
function hasRole(role) {
    return userRoles.includes(role);
}

// Check if user can access a specific section
function canAccessSection(section) {
    const accessMap = {
        'users': ['admin'],
        'roles': ['admin'],
        'clients': ['admin'],
        'sensors': ['admin', 'sensor_reader', 'sensor_writer'],
        'realms': ['admin'],
        'sessions': ['admin'],
        'security': ['admin'],
        'server-info': ['admin']
    };

    const requiredRoles = accessMap[section] || [];
    return requiredRoles.some(role => hasRole(role));
}

// Apply access control to UI sections
function applyAccessControl() {
    const sections = [
        'users', 'roles', 'clients', 'sensors',
        'realms', 'sessions', 'security', 'server-info'
    ];

    let hasAccessToAnySection = false;
    let firstAccessibleTab = null;

    // Process each section
    sections.forEach(section => {
        const tabElement = document.querySelector(`[href="#${section}"]`);
        const sectionElement = document.getElementById(section);

        if (!tabElement || !sectionElement) return;

        if (canAccessSection(section)) {
            hasAccessToAnySection = true;
            if (!firstAccessibleTab) {
                firstAccessibleTab = tabElement;
            }

            // Show loading state
            sectionElement.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;
        } else {
            // Hide tab
            tabElement.style.display = 'none';

            // Show access denied message
            sectionElement.innerHTML = `
                <div class="access-denied-message">
                    <i class="bi bi-shield-lock"></i>
                    <h3>Access Denied</h3>
                    <p>You do not have permission to access this section.</p>
                    <p class="text-muted">Required roles: ${getRequiredRolesForSection(section).join(', ')}</p>
                </div>
            `;
        }
    });

    // Handle case when user has no access to any section
    if (!hasAccessToAnySection) {
        showGlobalAccessDenied('You do not have access to any sections.');
    } else if (firstAccessibleTab) {
        // Activate first accessible tab
        const tab = new bootstrap.Tab(firstAccessibleTab);
        tab.show();
    }
}

// Get required roles for a section
function getRequiredRolesForSection(section) {
    const accessMap = {
        'users': ['admin'],
        'roles': ['admin'],
        'clients': ['admin'],
        'sensors': ['admin', 'sensor_reader', 'sensor_writer'],
        'realms': ['admin'],
        'sessions': ['admin'],
        'security': ['admin'],
        'server-info': ['admin']
    };
    return accessMap[section] || [];
}

// Show global access denied message
function showGlobalAccessDenied(message) {
    const mainContent = document.querySelector('.container-fluid');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="global-access-denied">
                <i class="bi bi-shield-lock-fill"></i>
                <h2>Access Denied</h2>
                <p>${message}</p>
                <a href="/logout" class="btn btn-primary">Logout</a>
            </div>
        `;
    }
}

// Initialize RBAC when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Export functions for use in other modules
window.hasRole = hasRole;
window.canAccessSection = canAccessSection;