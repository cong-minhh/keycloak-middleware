require('dotenv').config();

const test = require('node:test');
const assert = require('node:assert');
const nock = require('nock');
const jwt = require('jsonwebtoken');
const KeycloakAdminService = require('../services/keycloakAdminService'); // Adjust path as necessary

test('KeycloakAdminService Tests', async (t) => {
    let service;
    let realmName = process.env.KEYCLOAK_REALM || 'DemoRealm';

    // Setup service with test configuration before each test
    t.beforeEach(() => {
        service = new KeycloakAdminService({
            keycloakBaseUrl: process.env.KEYCLOAK_BASE_URL || 'http://localhost:8080',
            realm: process.env.KEYCLOAK_REALM || 'DemoRealm',
            adminClientId: process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'robot-control-app',
            clientSecret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET
        });
    });

    // Clean up mocks after each test
    t.afterEach(() => {
        nock.cleanAll();
    });

    // Test Case 1: Authenticate and get access token
    await t.test('should authenticate and get an access token', async () => {
        const mockPayload = {
            exp: Math.floor(Date.now() / 1000) + 3600,
            sub: '123'
        };
        const mockToken = jwt.sign(mockPayload, 'secret');
        const mockTokenResponse = {
            access_token: mockToken,
            expires_in: 3600,
            token_type: 'Bearer'
        };

        nock('http://localhost:8080')
            .post('/realms/DemoRealm/protocol/openid-connect/token')
            .reply(200, mockTokenResponse);

        const token = await service.authenticate();
        assert.strictEqual(token, mockToken, 'Token should match the mocked token');
        assert.strictEqual(service.accessToken, mockToken, 'Service accessToken should be set');
        const decoded = jwt.decode(mockToken);
        assert.strictEqual(service.tokenExpiresAt, decoded.exp * 1000, 'Token expiration should be set correctly');
    });

    // Test Case 2: Get users
    await t.test('should get users', async () => {
        const mockPayload = {
            exp: Math.floor(Date.now() / 1000) + 3600,
            sub: '123'
        };
        const mockToken = jwt.sign(mockPayload, 'secret');
        const mockTokenResponse = {
            access_token: mockToken,
            expires_in: 3600,
            token_type: 'Bearer'
        };

        nock('http://localhost:8080')
            .post('/realms/DemoRealm/protocol/openid-connect/token')
            .reply(200, mockTokenResponse);

        const mockUsers = [
            { id: 'user1', username: 'user1' },
            { id: 'user2', username: 'user2' }
        ];
        nock('http://localhost:8080')
            .get('/admin/realms/DemoRealm/users')
            .reply(200, mockUsers);

        const users = await service.getUsers();
        assert.deepStrictEqual(users, mockUsers, 'Users should match the mocked response');
    });

    // Test Case 3: Create user
    await t.test('should create a user', async () => {
        const mockPayload = {
            exp: Math.floor(Date.now() / 1000) + 3600,
            sub: '123'
        };
        const mockToken = jwt.sign(mockPayload, 'secret');
        const mockTokenResponse = {
            access_token: mockToken,
            expires_in: 3600,
            token_type: 'Bearer'
        };

        nock('http://localhost:8080')
            .post('/realms/DemoRealm/protocol/openid-connect/token')
            .reply(200, mockTokenResponse);

        const mockCreatedUser = {
            id: 'new-user-id',
            username: 'newuser'
        };
        nock('http://localhost:8080')
            .post('/admin/realms/DemoRealm/users', {
                username: 'newuser',
                email: 'newuser@example.com',
                firstName: 'First',
                lastName: 'Last',
                enabled: true,
                emailVerified: false,
                credentials: [{
                    type: 'password',
                    value: 'password123',
                    temporary: true
                }]
            })
            .reply(201, mockCreatedUser);

        const userData = {
            username: 'newuser',
            email: 'newuser@example.com',
            firstName: 'First',
            lastName: 'Last',
            enabled: true,
            password: 'password123'
        };

        const createdUser = await service.createUser(userData);
        assert.deepStrictEqual(createdUser, mockCreatedUser, 'Created user should match the mocked response');
    });

    // Test Case 4: Authentication failure
    await t.test('should throw error when authentication fails', async () => {
        nock('http://localhost:8080')
            .post('/realms/DemoRealm/protocol/openid-connect/token')
            .reply(401, { error: 'invalid_client' });

        try {
            await service.authenticate();
            assert.fail('Should have thrown an error');
        } catch (error) {
            assert.ok(error.message.includes('Authentication failed'), 'Error message should indicate authentication failure');
        }
    });
});