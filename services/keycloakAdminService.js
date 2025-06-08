const axios = require('axios');
const jwt = require('jsonwebtoken');

class KeycloakAdminService {
    constructor(config) {
        // Initialize server info endpoint
        this.serverInfoEndpoint = '/admin/serverinfo';
        this.eventsEndpoint = '/admin/events';

        const { keycloakBaseUrl, realm, adminClientId, clientSecret } = config;

        if (!keycloakBaseUrl || !realm || !adminClientId || !clientSecret) {
            throw new Error('Missing required configuration parameters');
        }

        this.keycloakBaseUrl = keycloakBaseUrl;
        this.realm = realm;
        this.adminClientId = adminClientId;
        this.clientSecret = clientSecret;

        this.adminApiBaseUrl = `${keycloakBaseUrl}/admin/realms/${realm}`;
        this.tokenEndpoint = `${keycloakBaseUrl}/realms/${realm}/protocol/openid-connect/token`;
        this.accessToken = null;
        this.tokenExpiresAt = null;
    }

    async authenticate() {
        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials');
            params.append('client_id', this.adminClientId);
            params.append('client_secret', this.clientSecret);

            const response = await axios.post(this.tokenEndpoint, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            this.accessToken = response.data.access_token;
            // Decode token to get expiration time
            const decodedToken = jwt.decode(this.accessToken);
            this.tokenExpiresAt = decodedToken.exp * 1000; // Convert to milliseconds

            return this.accessToken;
        } catch (error) {
            const errorMessage = error.response?.data?.error_description || error.message;
            throw new Error(`Authentication failed: ${errorMessage}`);
        }
    }

    async ensureAuthenticated() {
        const currentTime = Date.now();
        const tokenExpired = !this.tokenExpiresAt || currentTime >= this.tokenExpiresAt;

        if (!this.accessToken || tokenExpired) {
            await this.authenticate();
        }

        return this.accessToken;
    }

    async getUsers(params = {}) {
        try {
            const token = await this.ensureAuthenticated();
            const response = await axios.get(`${this.adminApiBaseUrl}/users`, {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                params
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to fetch users: ${error.message}`);
        }
    }

    async getUser(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        try {
            const token = await this.ensureAuthenticated();
            const response = await axios.get(`${this.adminApiBaseUrl}/users/${userId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to fetch user ${userId}: ${error.message}`);
        }
    }

    async createUser(userData) {
        if (!userData || typeof userData !== 'object') {
            throw new Error('Valid user data object is required');
        }

        try {
            // Format user data according to Keycloak's API requirements
            const formattedUserData = {
                username: userData.username,
                email: userData.email,
                firstName: userData.firstName,
                lastName: userData.lastName,
                enabled: userData.enabled,
                emailVerified: false,
                credentials: userData.password ? [{
                    type: 'password',
                    value: userData.password,
                    temporary: true
                }] : undefined
            };

            const token = await this.ensureAuthenticated();
            const response = await axios.post(`${this.adminApiBaseUrl}/users`, formattedUserData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Create user error details:', error.response?.data);
            throw new Error(`Failed to create user: ${error.response?.data?.errorMessage || error.message}`);
        }
    }

    // User Management Methods
    async updateUser(userId, userData) {
        if (!userId || !userData || typeof userData !== 'object') {
            throw new Error('User ID and valid user data object are required');
        }

        try {
            const token = await this.ensureAuthenticated();
            const response = await axios.put(`${this.adminApiBaseUrl}/users/${userId}`, userData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to update user ${userId}: ${error.message}`);
        }
    }

    async deleteUser(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        try {
            const token = await this.ensureAuthenticated();
            await axios.delete(`${this.adminApiBaseUrl}/users/${userId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return true;
        } catch (error) {
            throw new Error(`Failed to delete user ${userId}: ${error.message}`);
        }
    }

    async resetPassword(userId, passwordData) {
        if (!userId || !passwordData || typeof passwordData !== 'object') {
            throw new Error('User ID and password data object are required');
        }

        try {
            const token = await this.ensureAuthenticated();
            await axios.put(`${this.adminApiBaseUrl}/users/${userId}/reset-password`, passwordData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return true;
        } catch (error) {
            throw new Error(`Failed to reset password for user ${userId}: ${error.message}`);
        }
    }

    // Role Management Methods
    async getRoles() {
        try {
            const token = await this.ensureAuthenticated();
            const response = await axios.get(`${this.adminApiBaseUrl}/roles`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to fetch roles: ${error.message}`);
        }
    }

    async createRole(roleData) {
        if (!roleData || typeof roleData !== 'object') {
            throw new Error('Valid role data object is required');
        }

        try {
            const token = await this.ensureAuthenticated();
            const response = await axios.post(`${this.adminApiBaseUrl}/roles`, roleData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to create role: ${error.message}`);
        }
    }

    async assignRole(userId, roleData) {
        if (!userId || !roleData || typeof roleData !== 'object') {
            throw new Error('User ID and valid role data object are required');
        }

        try {
            const token = await this.ensureAuthenticated();
            await axios.post(`${this.adminApiBaseUrl}/users/${userId}/role-mappings/realm`, roleData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return true;
        } catch (error) {
            throw new Error(`Failed to assign role to user ${userId}: ${error.message}`);
        }
    }

    // Group Management Methods
    async getGroups() {
        try {
            const token = await this.ensureAuthenticated();
            const response = await axios.get(`${this.adminApiBaseUrl}/groups`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to fetch groups: ${error.message}`);
        }
    }

    async createGroup(groupData) {
        if (!groupData || typeof groupData !== 'object') {
            throw new Error('Valid group data object is required');
        }

        try {
            const token = await this.ensureAuthenticated();
            const response = await axios.post(`${this.adminApiBaseUrl}/groups`, groupData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to create group: ${error.message}`);
        }
    }

    async assignUserToGroup(userId, groupId) {
        if (!userId || !groupId) {
            throw new Error('User ID and Group ID are required');
        }

        try {
            const token = await this.ensureAuthenticated();
            await axios.put(`${this.adminApiBaseUrl}/users/${userId}/groups/${groupId}`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return true;
        } catch (error) {
            throw new Error(`Failed to assign user ${userId} to group ${groupId}: ${error.message}`);
        }
    }

    // Client Management Methods
    async getClients(params = {}) {
        try {
            const token = await this.ensureAuthenticated();
            const response = await axios.get(`${this.adminApiBaseUrl}/clients`, {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                params
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to fetch clients: ${error.message}`);
        }
    }

    async getClient(clientId) {
        if (!clientId) {
            throw new Error('Client ID is required');
        }

        try {
            const token = await this.ensureAuthenticated();
            const response = await axios.get(`${this.adminApiBaseUrl}/clients/${clientId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to fetch client ${clientId}: ${error.message}`);
        }
    }

    async createClient(clientData) {
        if (!clientData || typeof clientData !== 'object') {
            throw new Error('Valid client data object is required');
        }

        try {
            const token = await this.ensureAuthenticated();
            const response = await axios.post(`${this.adminApiBaseUrl}/clients`, clientData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to create client: ${error.message}`);
        }
    }

    async updateClient(clientId, clientData) {
        if (!clientId || !clientData || typeof clientData !== 'object') {
            throw new Error('Client ID and valid client data object are required');
        }

        try {
            const token = await this.ensureAuthenticated();
            const response = await axios.put(`${this.adminApiBaseUrl}/clients/${clientId}`, clientData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to update client ${clientId}: ${error.message}`);
        }
    }

    async deleteClient(clientId) {
        if (!clientId) {
            throw new Error('Client ID is required');
        }

        try {
            const token = await this.ensureAuthenticated();
            await axios.delete(`${this.adminApiBaseUrl}/clients/${clientId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return true;
        } catch (error) {
            throw new Error(`Failed to delete client ${clientId}: ${error.message}`);
        }
    }

    // Realm Management Methods
    async getRealms() {
        try {
            const token = await this.ensureAuthenticated();
            const response = await axios.get(`${this.keycloakBaseUrl}/admin/realms`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to fetch realms: ${error.message}`);
        }
    }

    async getRealmConfig() {
        try {
            const token = await this.ensureAuthenticated();
            const response = await axios.get(`${this.adminApiBaseUrl}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to fetch realm config: ${error.message}`);
        }
    }

    // User Session Management
    async getUserSessions(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        try {
            const token = await this.ensureAuthenticated();
            const response = await axios.get(`${this.adminApiBaseUrl}/users/${userId}/sessions`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to fetch user sessions for user ${userId}: ${error.message}`);
        }
    }

    async logoutUser(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        try {
            const token = await this.ensureAuthenticated();
            await axios.delete(`${this.adminApiBaseUrl}/users/${userId}/sessions`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return true;
        } catch (error) {
            throw new Error(`Failed to logout user ${userId}: ${error.message}`);
        }
    }

    async sendVerifyEmail(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        try {
            const token = await this.ensureAuthenticated();
            await axios.put(`${this.adminApiBaseUrl}/users/${userId}/send-verify-email`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return true;
        } catch (error) {
            throw new Error(`Failed to send verification email to user ${userId}: ${error.message}`);
        }
    }

    // Security & Monitoring
    async clearUserBruteForce(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        try {
            const token = await this.ensureAuthenticated();
            await axios.post(`${this.adminApiBaseUrl}/attack-detection/brute-force/users/${userId}/clear`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return true;
        } catch (error) {
            throw new Error(`Failed to clear brute force for user ${userId}: ${error.message}`);
        }
    }

    async getServerInfo() {
        try {
            const token = await this.ensureAuthenticated();
            const response = await axios.get(`${this.keycloakBaseUrl}${this.serverInfoEndpoint}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to fetch server info: ${error.message}`);
        }
    }

    async getEvents(params = {}) {
        try {
            const token = await this.ensureAuthenticated();
            const response = await axios.get(`${this.keycloakBaseUrl}${this.eventsEndpoint}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                params
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to fetch events: ${error.message}`);
        }
    }

    // Get all roles for a specific client
    async getClientRoles(clientId) {
        if (!clientId) {
            throw new Error('Client ID is required');
        }
        try {
            const token = await this.ensureAuthenticated();
            const response = await axios.get(`${this.adminApiBaseUrl}/clients/${clientId}/roles`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to fetch client roles for client ${clientId}: ${error.message}`);
        }
    }

    // Create a new role for a specific client
    async createClientRole(clientId, roleData) {
        if (!clientId || !roleData || typeof roleData !== 'object') {
            throw new Error('Client ID and valid role data object are required');
        }
        try {
            const token = await this.ensureAuthenticated();
            const response = await axios.post(`${this.adminApiBaseUrl}/clients/${clientId}/roles`, roleData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to create client role for client ${clientId}: ${error.message}`);
        }
    }

    // Assign client roles to a user
    async assignClientRole(userId, clientId, roles) {
        if (!userId || !clientId || !roles || !Array.isArray(roles)) {
            throw new Error('User ID, Client ID, and valid roles array are required');
        }
        try {
            const token = await this.ensureAuthenticated();
            await axios.post(`${this.adminApiBaseUrl}/users/${userId}/role-mappings/clients/${clientId}`, roles, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return true;
        } catch (error) {
            throw new Error(`Failed to assign client roles to user ${userId}: ${error.message}`);
        }
    }

    // Get client roles assigned to a user
    async getUserClientRoles(userId, clientId) {
        if (!userId || !clientId) {
            throw new Error('User ID and Client ID are required');
        }
        try {
            const token = await this.ensureAuthenticated();
            const response = await axios.get(`${this.adminApiBaseUrl}/users/${userId}/role-mappings/clients/${clientId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to fetch client roles for user ${userId}: ${error.message}`);
        }
    }
}

module.exports = KeycloakAdminService;