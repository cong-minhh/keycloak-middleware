const axios = require('axios');

class ClientService {
    constructor(keycloakService) {
        this.keycloakService = keycloakService;
        this.baseUrl = keycloakService.adminApiBaseUrl;
    }

    async getClients(params = {}) {
        try {
            const token = await this.keycloakService.ensureAuthenticated();
            const response = await axios.get(`${this.baseUrl}/clients`, {
                headers: { Authorization: `Bearer ${token}` },
                params
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to fetch clients: ${error.message}`);
        }
    }

    async getClient(clientId) {
        if (!clientId) throw new Error('Client ID is required');
        try {
            const token = await this.keycloakService.ensureAuthenticated();
            const response = await axios.get(`${this.baseUrl}/clients/${clientId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to fetch client ${clientId}: ${error.message}`);
        }
    }

    async createClient(clientData) {
        if (!clientData || !clientData.clientId) {
            throw new Error('Valid client data with clientId is required');
        }
        try {
            const token = await this.keycloakService.ensureAuthenticated();
            const response = await axios.post(`${this.baseUrl}/clients`, clientData, {
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
        if (!clientId || !clientData) {
            throw new Error('Client ID and update data are required');
        }
        try {
            const token = await this.keycloakService.ensureAuthenticated();
            await axios.put(`${this.baseUrl}/clients/${clientId}`, clientData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return true;
        } catch (error) {
            throw new Error(`Failed to update client ${clientId}: ${error.message}`);
        }
    }

    async deleteClient(clientId) {
        if (!clientId) throw new Error('Client ID is required');
        try {
            const token = await this.keycloakService.ensureAuthenticated();
            await axios.delete(`${this.baseUrl}/clients/${clientId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return true;
        } catch (error) {
            throw new Error(`Failed to delete client ${clientId}: ${error.message}`);
        }
    }

    async getClientSecret(clientId) {
        if (!clientId) throw new Error('Client ID is required');
        try {
            const token = await this.keycloakService.ensureAuthenticated();
            const response = await axios.get(`${this.baseUrl}/clients/${clientId}/client-secret`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get client secret: ${error.message}`);
        }
    }

    async regenerateClientSecret(clientId) {
        if (!clientId) throw new Error('Client ID is required');
        try {
            const token = await this.keycloakService.ensureAuthenticated();
            const response = await axios.post(`${this.baseUrl}/clients/${clientId}/client-secret`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to regenerate client secret: ${error.message}`);
        }
    }
}

module.exports = ClientService;