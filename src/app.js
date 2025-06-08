const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongodb-session')(session);
const Keycloak = require('keycloak-connect');
const { KeycloakAccessDeniedWrapper, setupAccessDeniedRoute } = require('./modules/auth/middleware/KeycloakAccessDeniedWrapper');

const cors = require('cors');
const path = require('path');
const config = require('./config');
const middleware = require('./common/middleware');
const { createRoleBasedProtection } = require('./modules/auth/middleware/keycloak-protection');
const KeycloakService = require('./modules/auth/services/keycloakService');
const UserService = require('./modules/users/services/userService');
const RoleService = require('./modules/roles/services/roleService');
const ClientService = require('./modules/clients/services/clientService');
const SensorService = require('./modules/sensors/services/sensorService');

class App {
    constructor() {
        this.app = express();
        this.publicDirectory = path.join(__dirname, '..', 'public');
        this.setupMiddleware();
        this.setupServices();
        this.setupProtection();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    setupMiddleware() {
        // Basic middleware
        this.app.use(cors(config.cors));
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(express.static(this.publicDirectory));

        // Security middleware
        // this.app.use(middleware.securityHeaders);
        // this.app.use(middleware.rateLimiter);
        this.app.use(middleware.requestLogger);

        // Session setup
        const store = new MongoStore({
            uri: config.mongodb.uri,
            collection: config.mongodb.sessionCollection
        });

        this.app.use(session({
            secret: config.keycloak.sessionSecret,
            resave: false,
            saveUninitialized: false,
            store: store,
            cookie: {
                httpOnly: true,
                secure: config.server.env === 'production',
                maxAge: config.keycloak.sessionMaxAge
            }
        }));

        // Keycloak setup
        this.keycloak = new Keycloak({ store: store });
        const keycloakWrapper = new KeycloakAccessDeniedWrapper(this.keycloak);
        this.app.use(keycloakWrapper.getKeycloakInstance().middleware());
        setupAccessDeniedRoute(this.app);
    }

    setupServices() {
        // Initialize services
        this.keycloakService = new KeycloakService(config.keycloak);
        this.userService = new UserService(this.keycloakService);
        this.roleService = new RoleService(this.keycloakService);
        this.clientService = new ClientService(this.keycloakService);
        this.sensorService = new SensorService(config.kafka);
    }

    setupProtection() {
        // Create different protection middleware for different contexts

        // API protection (JSON responses)
        this.apiAuth = createRoleBasedProtection(this.keycloak, {
            unauthorizedMessage: 'Authentication required to access API',
            forbiddenMessage: 'Insufficient permissions to access this resource',
            jsonResponse: true,
            logUnauthorized: true,
            customErrorHandler: (error, req, res, next) => {
                // Pass to global error handler for consistent API error responses
                const { AuthenticationError, AuthorizationError } = require('./common/errors');

                if (error.message?.includes('Access denied') || error.status === 403) {
                    next(new AuthorizationError('Insufficient permissions to access this resource'));
                } else {
                    next(new AuthenticationError('Authentication required to access API'));
                }
            }
        });

        // Web protection (HTML responses with redirects)
        this.webAuth = createRoleBasedProtection(this.keycloak, {
            unauthorizedMessage: 'Please log in to access this page',
            forbiddenMessage: 'You do not have permission to access this page',
            redirectUrl: '/login',
            jsonResponse: false,
            logUnauthorized: true
        });

        // Admin-specific protection
        this.adminAuth = createRoleBasedProtection(this.keycloak, {
            unauthorizedMessage: 'Admin authentication required',
            forbiddenMessage: 'Admin privileges required to access this resource',
            jsonResponse: true,
            logUnauthorized: true,
            customErrorHandler: (error, req, res, next) => {
                const { AuthenticationError, AuthorizationError } = require('./common/errors');

                if (error.message?.includes('Access denied') || error.status === 403) {
                    next(new AuthorizationError('Admin privileges required to access this resource'));
                } else {
                    next(new AuthenticationError('Admin authentication required'));
                }
            }
        });

        // Sensor-specific protection (might have different requirements)
        this.sensorAuth = createRoleBasedProtection(this.keycloak, {
            unauthorizedMessage: 'Authentication required to access sensor data',
            forbiddenMessage: 'Insufficient permissions to access sensor data',
            jsonResponse: true,
            logUnauthorized: true,
            customErrorHandler: (error, req, res, next) => {
                const { AuthenticationError, AuthorizationError } = require('./common/errors');

                if (error.message?.includes('Access denied') || error.status === 403) {
                    next(new AuthorizationError('Insufficient permissions to access sensor data'));
                } else {
                    next(new AuthenticationError('Authentication required to access sensor data'));
                }
            }
        });
    }

    setupRoutes() {
        // Load route modules with appropriate protection middleware
        const userRoutes = require('./modules/users/routes')(this.keycloak, this.userService);
        const roleRoutes = require('./modules/roles/routes')(this.keycloak, this.roleService);
        const clientRoutes = require('./modules/clients/routes')(this.keycloak, this.clientService);
        const sensorRoutes = require('./modules/sensors/routes')(this.keycloak, this.sensorService);
        // const accessDeniedRoute = require('./modules/auth/routes/accessDenied')();

        // Register API routes with admin protection
        this.app.use('/api/admin/users', userRoutes);
        this.app.use('/api/admin/roles', roleRoutes);
        this.app.use('/api/admin/clients', clientRoutes);

        // Register sensor routes with sensor-specific protection
        this.app.use('/api/sensors', sensorRoutes);

        // Access denied route

        // Authentication routes
        this.setupAuthRoutes();

        // Home route with web protection
        this.app.get('/', this.keycloak.protect('realm:admin'), (req, res) => {
            res.sendFile('index.html', { root: this.publicDirectory });
        });

        // Protected admin dashboard
        // TODO: Create admin dashboard with web protection
        this.app.get('/admin', this.keycloak.protect('realm:admin'), (req, res) => {
            res.sendFile('index.html', { root: this.publicDirectory });
        });

        // User profile page
        // TODO: Create user profile page with web protection
        this.app.get('/profile', this.webAuth.authenticate, (req, res) => {
            res.sendFile('profile.html', { root: this.publicDirectory });
        });
    }

    setupAuthRoutes() {
        // Login route
        this.app.get('/login', (req, res) => {
            const loginUrl = this.keycloak.loginUrl({
                redirectUri: config.server.baseUrl + '/auth/callback' // Add a callback route
            });
            console.log('Redirecting to:', loginUrl);
            res.redirect(loginUrl);
        });

        // Logout route
        this.app.get('/logout', (req, res) => {
            // Get Keycloak logout URL with post-logout redirect
            const logoutUrl = this.keycloak.logoutUrl({
                redirectUri: config.server.baseUrl
            });

            // Clear local session
            req.session.destroy((err) => {
                if (err) {
                    console.error('Error destroying session:', err);
                }

                // Clear session cookie
                res.clearCookie('connect.sid');
                // Clear Keycloak cookies
                res.clearCookie('KEYCLOAK_IDENTITY', { path: '/' });
                res.clearCookie('KEYCLOAK_SESSION', { path: '/' });

                // Redirect to Keycloak logout
                res.redirect(logoutUrl);
            });
        });

        // Auth status endpoint for SPAs
        this.app.get('/api/auth/status', (req, res) => {
            const isAuthenticated = req.kauth && req.kauth.grant;

            if (isAuthenticated) {
                const token = req.kauth.grant.access_token;
                const userInfo = {
                    username: token.content.preferred_username,
                    email: token.content.email,
                    roles: token.content.realm_access?.roles || [],
                    clientRoles: token.content.resource_access || {}
                };

                res.json({
                    authenticated: true,
                    user: userInfo
                });
            } else {
                res.json({
                    authenticated: false,
                    loginUrl: '/login'
                });
            }
        });

        // Token refresh endpoint
        this.app.post('/api/auth/refresh', this.apiAuth.authenticate, async (req, res, next) => {
            try {
                if (req.kauth && req.kauth.grant) {
                    // Keycloak will automatically refresh tokens if needed
                    await req.kauth.grant.update();

                    res.json({
                        success: true,
                        message: 'Token refreshed successfully'
                    });
                } else {
                    const { AuthenticationError } = require('./common/errors');
                    throw new AuthenticationError('No valid session found');
                }
            } catch (error) {
                next(error);
            }
        });
    }

    setupErrorHandling() {
        // 404 handler
        this.app.use((req, res, next) => {
            const { NotFoundError } = require('./common/errors');
            next(new NotFoundError('Route'));
        });

        // Global error handler
        this.app.use(middleware.errorHandler);
    }

    // Method to get protection middleware for external use
    getProtectionMiddleware(type = 'api') {
        switch (type) {
            case 'api':
                return this.apiAuth;
            case 'web':
                return this.webAuth;
            case 'admin':
                return this.adminAuth;
            case 'sensor':
                return this.sensorAuth;
            default:
                return this.apiAuth;
        }
    }

    // Health check endpoint
    setupHealthCheck() {
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: config.server.env,
                version: process.env.npm_package_version || '1.0.0'
            });
        });
    }

    start() {
        // Add health check
        this.setupHealthCheck();

        const port = config.server.port;
        this.app.listen(port, () => {
            console.log(`Server running on port http://localhost:${port} in ${config.server.env} mode`);
            console.log(`Health check available at: http://localhost:${port}/health`);
            console.log(`API documentation: http://localhost:${port}/api-docs`);
        });
    }
}

module.exports = App;