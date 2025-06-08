const axios = require('axios');

class RoleService {
    constructor(keycloakService) {
        this.keycloakService = keycloakService;
        this.baseUrl = keycloakService.adminApiBaseUrl;
    }

    async getRoles() {
        try {
            const token = await this.keycloakService.ensureAuthenticated();
            const response = await axios.get(`${this.baseUrl}/roles`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to fetch roles: ${error.message}`);
        }
    }

    async createRole(roleData) {
        if (!roleData || !roleData.name) {
            throw new Error('Role name is required');
        }
        try {
            const token = await this.keycloakService.ensureAuthenticated();
            const response = await axios.post(`${this.baseUrl}/roles`, roleData, {
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

    async getClientRoles(clientId) {
        if (!clientId) throw new Error('Client ID is required');
        try {
            const token = await this.keycloakService.ensureAuthenticated();
            const response = await axios.get(`${this.baseUrl}/clients/${clientId}/roles`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to fetch client roles: ${error.message}`);
        }
    }

    async createClientRole(clientId, roleData) {
        if (!clientId || !roleData || !roleData.name) {
            throw new Error('Client ID and role name are required');
        }
        try {
            const token = await this.keycloakService.ensureAuthenticated();
            const response = await axios.post(`${this.baseUrl}/clients/${clientId}/roles`, roleData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to create client role: ${error.message}`);
        }
    }

    async assignUserRoles(userId, roles) {
        if (!userId || !Array.isArray(roles)) {
            throw new Error('User ID and roles array are required');
        }
        try {
            const token = await this.keycloakService.ensureAuthenticated();
            await axios.post(`${this.baseUrl}/users/${userId}/role-mappings/realm`, roles, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return true;
        } catch (error) {
            throw new Error(`Failed to assign roles to user: ${error.message}`);
        }
    }

    async assignClientRoles(userId, clientId, roles) {
        if (!userId || !clientId || !Array.isArray(roles)) {
            throw new Error('User ID, Client ID, and roles array are required');
        }
        try {
            const token = await this.keycloakService.ensureAuthenticated();
            await axios.post(`${this.baseUrl}/users/${userId}/role-mappings/clients/${clientId}`, roles, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return true;
        } catch (error) {
            throw new Error(`Failed to assign client roles to user: ${error.message}`);
        }
    }
}

module.exports = RoleService;