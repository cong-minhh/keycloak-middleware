const axios = require('axios');

class UserService {
    constructor(keycloakService) {
        this.keycloakService = keycloakService;
        this.baseUrl = keycloakService.adminApiBaseUrl;
    }

    async getUsers(query = {}) {
        try {
            const token = await this.keycloakService.ensureAuthenticated();
            const response = await axios.get(`${this.baseUrl}/users`, {
                headers: { Authorization: `Bearer ${token}` },
                params: query
            });
            return response.data;
        } catch (error) {
            if (error.response) {
                throw new Error(`Failed to fetch users: ${error.response.status} - ${error.response.data?.error || error.response.statusText}`);
            }
            throw new Error(`Failed to fetch users: ${error.message}`);
        }
    }

    async getUser(userId) {
        if (!userId) throw new Error('User ID is required');

        try {
            const token = await this.keycloakService.ensureAuthenticated();
            const response = await axios.get(`${this.baseUrl}/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error(`User ${userId} not found`);
            }
            if (error.response) {
                throw new Error(`Failed to fetch user ${userId}: ${error.response.status} - ${error.response.data?.error || error.response.statusText}`);
            }
            throw new Error(`Failed to fetch user ${userId}: ${error.message}`);
        }
    }

    async createUser(userData) {
        if (!userData || typeof userData !== 'object') {
            throw new Error('Valid user data object is required');
        }

        // Validate required fields for Keycloak user creation
        if (!userData.username) {
            throw new Error('Username is required for user creation');
        }

        try {
            const token = await this.keycloakService.ensureAuthenticated();
            const response = await axios.post(`${this.baseUrl}/users`, userData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            // Keycloak returns 201 for successful creation, but no body
            // The user ID is in the Location header
            if (response.status === 201) {
                const locationHeader = response.headers.location;
                if (locationHeader) {
                    const userId = locationHeader.split('/').pop();
                    return { id: userId, created: true };
                }
                return { created: true };
            }

            return response.data;
        } catch (error) {
            if (error.response?.status === 409) {
                throw new Error('User already exists with this username or email');
            }
            if (error.response) {
                throw new Error(`Failed to create user: ${error.response.status} - ${error.response.data?.errorMessage || error.response.statusText}`);
            }
            throw new Error(`Failed to create user: ${error.message}`);
        }
    }

    async updateUser(userId, userData) {
        if (!userId || !userData || typeof userData !== 'object') {
            throw new Error('User ID and valid user data object are required');
        }

        try {
            const token = await this.keycloakService.ensureAuthenticated();
            const response = await axios.put(`${this.baseUrl}/users/${userId}`, userData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return { updated: true, status: response.status };
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error(`User ${userId} not found`);
            }
            if (error.response) {
                throw new Error(`Failed to update user ${userId}: ${error.response.status} - ${error.response.data?.errorMessage || error.response.statusText}`);
            }
            throw new Error(`Failed to update user ${userId}: ${error.message}`);
        }
    }

    async deleteUser(userId) {
        if (!userId) throw new Error('User ID is required');

        try {
            const token = await this.keycloakService.ensureAuthenticated();
            const response = await axios.delete(`${this.baseUrl}/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return { deleted: true, status: response.status };
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error(`User ${userId} not found`);
            }
            if (error.response) {
                throw new Error(`Failed to delete user ${userId}: ${error.response.status} - ${error.response.data?.errorMessage || error.response.statusText}`);
            }
            throw new Error(`Failed to delete user ${userId}: ${error.message}`);
        }
    }

    async resetPassword(userId, passwordData) {
        if (!userId || !passwordData || !passwordData.value) {
            throw new Error('User ID and password value are required');
        }

        try {
            const token = await this.keycloakService.ensureAuthenticated();
            const response = await axios.put(`${this.baseUrl}/users/${userId}/reset-password`, {
                type: 'password',
                value: passwordData.value,
                temporary: passwordData.temporary !== undefined ? passwordData.temporary : false
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return { passwordReset: true, status: response.status };
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error(`User ${userId} not found`);
            }
            if (error.response) {
                throw new Error(`Failed to reset password for user ${userId}: ${error.response.status} - ${error.response.data?.errorMessage || error.response.statusText}`);
            }
            throw new Error(`Failed to reset password for user ${userId}: ${error.message}`);
        }
    }

    // Additional helper methods for common Keycloak operations
    async enableUser(userId) {
        return this.updateUser(userId, { enabled: true });
    }

    async disableUser(userId) {
        return this.updateUser(userId, { enabled: false });
    }

    async getUserGroups(userId) {
        if (!userId) throw new Error('User ID is required');

        try {
            const token = await this.keycloakService.ensureAuthenticated();
            const response = await axios.get(`${this.baseUrl}/users/${userId}/groups`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error(`User ${userId} not found`);
            }
            if (error.response) {
                throw new Error(`Failed to fetch groups for user ${userId}: ${error.response.status} - ${error.response.data?.errorMessage || error.response.statusText}`);
            }
            throw new Error(`Failed to fetch groups for user ${userId}: ${error.message}`);
        }
    }

    async getUserRoles(userId) {
        if (!userId) throw new Error('User ID is required');

        try {
            const token = await this.keycloakService.ensureAuthenticated();
            const response = await axios.get(`${this.baseUrl}/users/${userId}/role-mappings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error(`User ${userId} not found`);
            }
            if (error.response) {
                throw new Error(`Failed to fetch roles for user ${userId}: ${error.response.status} - ${error.response.data?.errorMessage || error.response.statusText}`);
            }
            throw new Error(`Failed to fetch roles for user ${userId}: ${error.message}`);
        }
    }
}

module.exports = UserService;