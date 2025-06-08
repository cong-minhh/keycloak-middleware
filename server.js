// require('dotenv').config();

// const express = require('express');
// const session = require('express-session');
// const Keycloak = require('keycloak-connect');
// const cors = require('cors');
// const KeycloakAdminService = require('./services/keycloakAdminService');
// const MongoStore = require('connect-mongodb-session')(session);
// const { body, validationResult } = require('express-validator');

// const app = express();

// // Enable CORS with specific origin and credentials
// app.use(cors({
//     origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
// }));

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Serve static files
// app.use(express.static('public'));

// // Initialize KeycloakAdminService
// const keycloakAdminService = new KeycloakAdminService({
//     keycloakBaseUrl: process.env.KEYCLOAK_BASE_URL || 'http://localhost:8080',
//     realm: process.env.KEYCLOAK_REALM || 'DemoRealm',
//     adminClientId: process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'robot-control-app',
//     clientSecret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET
// });

// // // API Key middleware
// // const validateApiKey = (req, res, next) => {
// //     const apiKey = req.headers['x-api-key'];

// //     // Check if API key is configured
// //     if (!process.env.API_KEY) {
// //         console.error('API_KEY environment variable is not configured');
// //         return res.status(500).json({ error: 'API key configuration error' });
// //     }

// //     // Check if API key is provided in request
// //     if (!apiKey) {
// //         console.warn(`Missing API key in request: ${req.method} ${req.url}`);
// //         return res.status(401).json({ error: 'API key is required', message: 'Please provide an API key using the X-API-Key header' });
// //     }

// //     // Validate API key
// //     if (apiKey !== process.env.API_KEY) {
// //         console.warn(`Invalid API key attempt from IP: ${req.ip}`);
// //         return res.status(403).json({ error: 'Invalid API key', message: 'The provided API key is not valid' });
// //     }

// //     next();
// // };

// // Session store setup
// const store = new MongoStore({
//     uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/keycloak-sessions',
//     collection: 'sessions'
// });

// // Session setup
// app.use(session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: true,
//     store: store,
//     cookie: {
//         httpOnly: true,
//         maxAge: 1000 * 60 * 60 // 1 hour
//     }
// }));

// // Keycloak setup
// const keycloak = new Keycloak({ store: store });

// // Apply API Key middleware before Keycloak
// // app.use(validateApiKey);

// // Keycloak middleware
// app.use(keycloak.middleware());

// // Global request logging with sanitized token content
// app.use((req, res, next) => {
//     console.log(`Incoming request: ${req.method} ${req.url}`);
//     if (req.kauth?.grant?.access_token?.content) {
//         const { sub, preferred_username } = req.kauth.grant.access_token.content;
//         console.log('User info:', { sub, preferred_username });
//     }
//     next();
// });

// // Global error handler
// app.use((err, req, res, next) => {
//     console.error(err.stack);
//     res.status(500).json({ error: 'Internal server error' });
// });

// // Home route - Serve the admin dashboard
// app.get('/', keycloak.protect(), (req, res) => {
//     res.sendFile('index.html', { root: './public' });
// });

// // Sensors route - Serve the sensors dashboard
// app.get('/sensors', keycloak.protect('robot-control-app:sensor_reader'), (req, res) => {
//     res.sendFile('sensors.html', { root: './public' });
// });

// // Protected route
// app.get('/protected', keycloak.protect(), (req, res) => {
//     res.send('This is a protected route. You are authenticated!');
// });

// // Admin route
// app.get('/admin', keycloak.protect('realm:admin'), (req, res) => {
//     const { sub, preferred_username, realm_access } = req.kauth.grant.access_token.content;
//     res.json({
//         message: 'Welcome, Admin!',
//         user: { sub, preferred_username, roles: realm_access.roles }
//     });
// });

// // User Management Routes
// app.get('/api/admin/users', keycloak.protect('realm:admin'), async (req, res) => {
//     try {
//         const users = await keycloakAdminService.getUsers();
//         res.json(users);
//     } catch (error) {
//         console.error('Error fetching users:', error);
//         res.status(500).json({ error: 'Failed to fetch users', details: error.message });
//     }
// });

// app.get('/api/admin/users/:userId', keycloak.protect('realm:admin'), async (req, res) => {
//     try {
//         const user = await keycloakAdminService.getUser(req.params.userId);
//         res.json(user);
//     } catch (error) {
//         console.error('Error fetching user:', error);
//         res.status(500).json({ error: 'Failed to fetch user', details: error.message });
//     }
// });

// app.post('/api/admin/users', [
//     keycloak.protect('realm:admin'),
//     body('username').notEmpty().trim(),
//     body('email').isEmail(),
//     body('firstName').notEmpty().trim(),
//     body('lastName').notEmpty().trim(),
//     body('enabled').isBoolean()
// ], async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//         return res.status(400).json({ errors: errors.array() });
//     }

//     try {
//         const user = await keycloakAdminService.createUser(req.body);
//         res.status(201).json(user);
//     } catch (error) {
//         console.error('Error creating user:', error);
//         res.status(500).json({ error: 'Failed to create user', details: error.message });
//     }
// });

// app.put('/api/admin/users/:userId', [
//     keycloak.protect('realm:admin'),
//     body('email').optional().isEmail(),
//     body('firstName').optional().trim(),
//     body('lastName').optional().trim(),
//     body('enabled').optional().isBoolean()
// ], async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//         return res.status(400).json({ errors: errors.array() });
//     }

//     try {
//         await keycloakAdminService.updateUser(req.params.userId, req.body);
//         res.json({ message: 'User updated successfully' });
//     } catch (error) {
//         console.error('Error updating user:', error);
//         res.status(500).json({ error: 'Failed to update user', details: error.message });
//     }
// });

// app.delete('/api/admin/users/:userId', keycloak.protect('realm:admin'), async (req, res) => {
//     try {
//         await keycloakAdminService.deleteUser(req.params.userId);
//         res.json({ message: 'User deleted successfully' });
//     } catch (error) {
//         console.error('Error deleting user:', error);
//         res.status(500).json({ error: 'Failed to delete user', details: error.message });
//     }
// });

// app.put('/api/admin/users/:userId/reset-password', [
//     // keycloak.protect('realm:admin'),
//     // body('password').isLength({ min: 8 })
// ], async (req, res) => {
//     console.log('Resetting password for user:', req.params.userId); // Log the user ID

//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//         return res.status(400).json({ errors: errors.array() });
//     }
//     try {
//         await keycloakAdminService.resetPassword(req.params.userId, { value: req.body.password, temporary: true });
//         res.json({ message: 'Password reset successfully' });
//     } catch (error) {
//         console.error('Error resetting password:', error);
//         res.status(500).json({ error: 'Failed to reset password', details: error.message });
//     }
// });

// // Role Management Routes
// app.get('/api/admin/roles', keycloak.protect('realm:admin'), async (req, res) => {
//     try {
//         const roles = await keycloakAdminService.getRoles();
//         res.json(roles);
//     } catch (error) {
//         console.error('Error fetching roles:', error);
//         res.status(500).json({ error: 'Failed to fetch roles', details: error.message });
//     }
// });

// app.post('/api/admin/roles', [
//     keycloak.protect('realm:admin'),
//     body('name').notEmpty().trim(),
//     body('description').optional().trim()
// ], async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//         return res.status(400).json({ errors: errors.array() });
//     }

//     try {
//         const role = await keycloakAdminService.createRole(req.body);
//         res.status(201).json(role);
//     } catch (error) {
//         console.error('Error creating role:', error);
//         res.status(500).json({ error: 'Failed to create role', details: error.message });
//     }
// });

// app.post('/api/admin/users/:userId/roles', [
//     keycloak.protect('realm:admin'),
//     body('roles').isArray()
// ], async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//         return res.status(400).json({ errors: errors.array() });
//     }

//     try {
//         await keycloakAdminService.assignRole(req.params.userId, req.body.roles);
//         res.json({ message: 'Roles assigned successfully' });
//     } catch (error) {
//         console.error('Error assigning roles:', error);
//         res.status(500).json({ error: 'Failed to assign roles', details: error.message });
//     }
// });

// // Group Management Routes
// app.get('/api/admin/groups', keycloak.protect('realm:admin'), async (req, res) => {
//     try {
//         const groups = await keycloakAdminService.getGroups();
//         res.json(groups);
//     } catch (error) {
//         console.error('Error fetching groups:', error);
//         res.status(500).json({ error: 'Failed to fetch groups', details: error.message });
//     }
// });

// app.post('/api/admin/groups', [
//     keycloak.protect('realm:admin'),
//     body('name').notEmpty().trim(),
//     body('path').optional().trim()
// ], async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//         return res.status(400).json({ errors: errors.array() });
//     }

//     try {
//         const group = await keycloakAdminService.createGroup(req.body);
//         res.status(201).json(group);
//     } catch (error) {
//         console.error('Error creating group:', error);
//         res.status(500).json({ error: 'Failed to create group', details: error.message });
//     }
// });

// app.put('/api/admin/users/:userId/groups/:groupId', keycloak.protect('realm:admin'), async (req, res) => {
//     try {
//         await keycloakAdminService.assignUserToGroup(req.params.userId, req.params.groupId);
//         res.json({ message: 'User assigned to group successfully' });
//     } catch (error) {
//         console.error('Error assigning user to group:', error);
//         res.status(500).json({ error: 'Failed to assign user to group', details: error.message });
//     }
// });

// // Client Management Routes
// app.get('/api/admin/clients', keycloak.protect('realm:admin'), async (req, res) => {
//     try {
//         const clients = await keycloakAdminService.getClients();
//         res.json(clients);
//     } catch (error) {
//         console.error('Error fetching clients:', error);
//         res.status(500).json({ error: 'Failed to fetch clients', details: error.message });
//     }
// });

// app.get('/api/admin/clients/:clientId', keycloak.protect('realm:admin'), async (req, res) => {
//     try {
//         const client = await keycloakAdminService.getClient(req.params.clientId);
//         res.json(client);
//     } catch (error) {
//         console.error('Error fetching client:', error);
//         res.status(500).json({ error: 'Failed to fetch client', details: error.message });
//     }
// });

// app.post('/api/admin/clients', [
//     keycloak.protect('realm:admin'),
//     body('clientId').notEmpty().trim(),
//     body('name').notEmpty().trim(),
//     body('description').optional().trim(),
//     body('enabled').isBoolean()
// ], async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//         return res.status(400).json({ errors: errors.array() });
//     }

//     try {
//         const client = await keycloakAdminService.createClient(req.body);
//         res.status(201).json(client);
//     } catch (error) {
//         console.error('Error creating client:', error);
//         res.status(500).json({ error: 'Failed to create client', details: error.message });
//     }
// });

// app.put('/api/admin/clients/:clientId', [
//     keycloak.protect('realm:admin'),
//     body('name').optional().trim(),
//     body('description').optional().trim(),
//     body('enabled').optional().isBoolean()
// ], async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//         return res.status(400).json({ errors: errors.array() });
//     }

//     try {
//         await keycloakAdminService.updateClient(req.params.clientId, req.body);
//         res.json({ message: 'Client updated successfully' });
//     } catch (error) {
//         console.error('Error updating client:', error);
//         res.status(500).json({ error: 'Failed to update client', details: error.message });
//     }
// });

// app.delete('/api/admin/clients/:clientId', keycloak.protect('realm:admin'), async (req, res) => {
//     try {
//         await keycloakAdminService.deleteClient(req.params.clientId);
//         res.json({ message: 'Client deleted successfully' });
//     } catch (error) {
//         console.error('Error deleting client:', error);
//         res.status(500).json({ error: 'Failed to delete client', details: error.message });
//     }
// });


// app.get('/api/admin/clients/:clientId/roles', keycloak.protect('realm:admin'), async (req, res) => {
//     try {
//         const roles = await keycloakAdminService.getClientRoles(req.params.clientId);
//         res.json(roles);
//     } catch (error) {
//         console.error('Error fetching client roles:', error);
//         res.status(500).json({ error: 'Failed to fetch client roles', details: error.message });
//     }
// });

// app.post('/api/admin/clients/:clientId/roles', [
//     keycloak.protect('realm:admin'),
//     body('name').notEmpty().trim(),
//     body('description').optional().trim()
// ], async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//         return res.status(400).json({ errors: errors.array() });
//     }
//     try {
//         const role = await keycloakAdminService.createClientRole(req.params.clientId, req.body);
//         await sendEventToKafka('role_events', {
//             event: 'client_role_created',
//             clientId: req.params.clientId,
//             roleName: req.body.name,
//             timestamp: new Date().toISOString()
//         });
//         res.status(201).json(role);
//     } catch (error) {
//         console.error('Error creating client role:', error);
//         res.status(500).json({ error: 'Failed to create client role', details: error.message });
//     }
// });

// app.post('/api/admin/users/:userId/clients/:clientId/roles', [
//     keycloak.protect('realm:admin'),
//     body('roles').isArray().withMessage('Roles must be an array'),
//     body('roles.*.id').notEmpty().withMessage('Role ID is required'),
//     body('roles.*.name').notEmpty().withMessage('Role name is required')
// ], async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//         return res.status(400).json({ errors: errors.array() });
//     }
//     try {
//         await keycloakAdminService.assignClientRole(req.params.userId, req.params.clientId, req.body.roles);
//         await sendEventToKafka('role_events', {
//             event: 'client_role_assigned',
//             userId: req.params.userId,
//             clientId: req.params.clientId,
//             roles: req.body.roles,
//             timestamp: new Date().toISOString()
//         });
//         res.json({ message: 'Client roles assigned successfully' });
//     } catch (error) {
//         console.error('Error assigning client roles:', error);
//         res.status(500).json({ error: 'Failed to assign client roles', details: error.message });
//     }
// });

// app.get('/api/admin/users/:userId/clients/:clientId/roles', keycloak.protect('realm:admin'), async (req, res) => {
//     try {
//         const roles = await keycloakAdminService.getUserClientRoles(req.params.userId, req.params.clientId);
//         res.json(roles);
//     } catch (error) {
//         console.error('Error fetching user client roles:', error);
//         res.status(500).json({ error: 'Failed to fetch user client roles', details: error.message });
//     }
// });

// // Sensor Data Routes
// app.get('/api/sensors', keycloak.protect('robot-control-app:sensor_reader'), async (req, res) => {
//     try {
//         // Simulated sensor data (replace with actual data from competition simulator)
//         const sensorData = {
//             robotId: 'robot-001',
//             position: { x: 10, y: 20 },
//             taskStatus: 'in_progress',
//             timestamp: new Date().toISOString()
//         };
//         res.json(sensorData);
//     } catch (error) {
//         console.error('Error fetching sensor data:', error);
//         res.status(500).json({ error: 'Failed to fetch sensor data', details: error.message });
//     }
// });

// app.post('/api/sensors', [
//     keycloak.protect('robot-control-app:sensor_writer'),
//     body('robotId').notEmpty(),
//     body('position.x').isNumeric(),
//     body('position.y').isNumeric(),
//     body('taskStatus').isIn(['assigned', 'in_progress', 'completed'])
// ], async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//         return res.status(400).json({ errors: errors.array() });
//     }
//     try {
//         const sensorData = {
//             robotId: req.body.robotId,
//             position: req.body.position,
//             taskStatus: req.body.taskStatus,
//             timestamp: new Date().toISOString()
//         };
//         await sendEventToKafka('sensor_data', {
//             event: 'sensor_update',
//             ...sensorData
//         });
//         res.status(201).json({ message: 'Sensor data recorded', data: sensorData });
//     } catch (error) {
//         console.error('Error recording sensor data:', error);
//         res.status(500).json({ error: 'Failed to record sensor data', details: error.message });
//     }
// });

// // Realm Management Routes
// app.get('/api/admin/realms', keycloak.protect('realm:admin'), async (req, res) => {
//     try {
//         const realms = await keycloakAdminService.getRealms();
//         res.json(realms);
//     } catch (error) {
//         console.error('Error fetching realms:', error);
//         res.status(500).json({ error: 'Failed to fetch realms', details: error.message });
//     }
// });

// app.get('/api/admin/realm-config', keycloak.protect('realm:admin'), async (req, res) => {
//     try {
//         const config = await keycloakAdminService.getRealmConfig();
//         res.json(config);
//     } catch (error) {
//         console.error('Error fetching realm config:', error);
//         res.status(500).json({ error: 'Failed to fetch realm config', details: error.message });
//     }
// });

// // User Session Management Routes
// app.get('/api/admin/users/:userId/sessions', keycloak.protect('realm:admin'), async (req, res) => {
//     try {
//         const sessions = await keycloakAdminService.getUserSessions(req.params.userId);
//         res.json(sessions);
//     } catch (error) {
//         console.error('Error fetching user sessions:', error);
//         res.status(500).json({ error: 'Failed to fetch user sessions', details: error.message });
//     }
// });

// app.delete('/api/admin/users/:userId/sessions', keycloak.protect('realm:admin'), async (req, res) => {
//     try {
//         await keycloakAdminService.logoutUser(req.params.userId);
//         res.json({ message: 'User logged out successfully' });
//     } catch (error) {
//         console.error('Error logging out user:', error);
//         res.status(500).json({ error: 'Failed to logout user', details: error.message });
//     }
// });

// app.put('/api/admin/users/:userId/send-verify-email', keycloak.protect('realm:admin'), async (req, res) => {
//     try {
//         await keycloakAdminService.sendVerifyEmail(req.params.userId);
//         res.json({ message: 'Verification email sent successfully' });
//     } catch (error) {
//         console.error('Error sending verification email:', error);
//         res.status(500).json({ error: 'Failed to send verification email', details: error.message });
//     }
// });

// // Security & Monitoring Routes
// app.post('/api/admin/attack-detection/brute-force/users/:userId/clear', keycloak.protect('realm:admin'), async (req, res) => {
//     try {
//         await keycloakAdminService.clearUserBruteForce(req.params.userId);
//         res.json({ message: 'Brute force detection cleared successfully' });
//     } catch (error) {
//         console.error('Error clearing brute force detection:', error);
//         res.status(500).json({ error: 'Failed to clear brute force detection', details: error.message });
//     }
// });

// app.get('/api/admin/server-info', keycloak.protect('realm:admin'), async (req, res) => {
//     try {
//         const serverInfo = await keycloakAdminService.getServerInfo();
//         res.json(serverInfo);
//     } catch (error) {
//         console.error('Error fetching server info:', error);
//         res.status(500).json({ error: 'Failed to fetch server info', details: error.message });
//     }
// });

// app.get('/api/admin/events', keycloak.protect('realm:admin'), async (req, res) => {
//     try {
//         const events = await keycloakAdminService.getEvents(req.query);
//         res.json(events);
//     } catch (error) {
//         console.error('Error fetching events:', error);
//         res.status(500).json({ error: 'Failed to fetch events', details: error.message });
//     }
// });

// // User profile route
// app.get('/api/me', keycloak.enforcer('employee:profile'), (req, res) => {
//     const { sub, preferred_username, email } = req.kauth.grant.access_token.content;
//     res.json({
//         message: 'Your profile',
//         user: { sub, preferred_username, email }
//     });
// });

// // Logout route
// app.get('/logout', (req, res) => {
//     req.session.destroy(() => {
//         keycloak.logout(req, res, {
//             redirectUri: '/' // Redirect to home page
//         });
//     });
// });

// // Start server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//     console.log(`Server running on localhost:${PORT}`);
// });