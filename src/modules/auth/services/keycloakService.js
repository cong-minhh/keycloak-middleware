const axios = require('axios');
const jwt = require('jsonwebtoken');

class KeycloakService {
    constructor(config) {
        const { baseUrl, realm, adminClientId, clientSecret } = config;

        if (!baseUrl || !realm || !adminClientId || !clientSecret) {
            throw new Error('Missing required configuration parameters');
        }

        this.baseUrl = baseUrl;
        this.realm = realm;
        this.adminClientId = adminClientId;
        this.clientSecret = clientSecret;
        this.adminApiBaseUrl = `${baseUrl}/admin/realms/${realm}`;
        this.tokenEndpoint = `${baseUrl}/realms/${realm}/protocol/openid-connect/token`;
        this.accessToken = null;
        this.tokenExpiresAt = null;
    }

    async authenticate() {
        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials');
            params.append('client_id', this.adminClientId);
            params.append('client_secret', this.clientSecret);

            const response = await axios.post(this.tokenEndpoint, params);
            this.accessToken = response.data.access_token;
            this.tokenExpiresAt = Date.now() + (response.data.expires_in * 1000);
            return this.accessToken;
        } catch (error) {
            throw new Error(`Authentication failed: ${error.message}`);
        }
    }

    async ensureAuthenticated() {
        if (!this.accessToken || !this.tokenExpiresAt || Date.now() >= this.tokenExpiresAt) {
            await this.authenticate();
        }
        return this.accessToken;
    }

    async getServerInfo() {
        try {
            const token = await this.ensureAuthenticated();
            const response = await axios.get(`${this.baseUrl}/admin/serverinfo`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to fetch server info: ${error.message}`);
        }
    }
}

module.exports = KeycloakService;