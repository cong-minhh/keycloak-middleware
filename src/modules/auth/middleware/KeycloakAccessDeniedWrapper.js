const express = require('express');
const path = require('path');
const fs = require('fs');

/**
 * Wrapper class that overrides the accessDenied method to redirect to /accessdenied
 */
class KeycloakAccessDeniedWrapper {
    constructor(keycloakInstance) {
        this.keycloakInstance = keycloakInstance;
        this.originalAccessDenied = keycloakInstance.accessDenied;
        this.overrideAccessDenied();
    }

    /**
     * Override the accessDenied method to redirect to /accessdenied route
     */
    overrideAccessDenied() {
        this.keycloakInstance.accessDenied = (req, res) => {
            // Extract context information for dynamic messaging
            const requestedResource = req.originalUrl || req.path;
            const requiredRoles = this.extractRequiredRoles(req);
            const userRoles = this.extractUserRoles(req);
            const action = this.extractAction(req);

            // Store context in session or query params for the access denied page
            const context = {
                resource: requestedResource,
                requiredRoles: requiredRoles,
                userRoles: userRoles,
                action: action,
                timestamp: new Date().toISOString(),
                userAgent: req.get('User-Agent'),
                ip: req.ip || req.connection.remoteAddress
            };

            // Redirect with context
            const queryString = new URLSearchParams({
                context: Buffer.from(JSON.stringify(context)).toString('base64')
            }).toString();

            res.redirect(`/accessdenied?${queryString}`);
        };
    }

    /**
     * Extract required roles from request context
     */
    extractRequiredRoles(req) {
        // Try to get roles from various sources
        if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
            const token = req.kauth.grant.access_token;
            // Extract from token or middleware context
            return req.requiredRoles || req.roles || ['authenticated-user'];
        }

        // Fallback: try to determine from route
        const routeRoles = this.getRouteRoles(req.path);
        return routeRoles || ['authenticated-user'];
    }

    /**
     * Extract user's current roles
     */
    extractUserRoles(req) {
        if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
            const token = req.kauth.grant.access_token.content;
            return token.realm_access?.roles || [];
        }
        return [];
    }

    /**
     * Extract the action being attempted
     */
    extractAction(req) {
        const method = req.method.toLowerCase();
        const path = req.path;

        // Determine action based on HTTP method and path
        if (method === 'get' && path.includes('/admin')) return 'access administrative features';
        if (method === 'post') return 'create or modify resources';
        if (method === 'put' || method === 'patch') return 'update resources';
        if (method === 'delete') return 'delete resources';
        if (path.includes('/reports')) return 'view reports';
        if (path.includes('/settings')) return 'modify settings';

        return 'access this resource';
    }

    /**
     * Get required roles for specific routes (customize based on your app)
     */
    getRouteRoles(path) {
        const roleMap = {
            '/admin': ['admin', 'super-admin'],
            '/reports': ['admin', 'analyst', 'manager'],
            '/settings': ['admin', 'super-admin'],
            '/users': ['admin', 'user-manager'],
            '/api': ['api-user', 'service-account']
        };

        for (const [route, roles] of Object.entries(roleMap)) {
            if (path.includes(route)) {
                return roles;
            }
        }

        return null;
    }

    /**
     * Get the wrapped Keycloak instance
     */
    getKeycloakInstance() {
        return this.keycloakInstance;
    }

    /**
     * Restore the original accessDenied method if needed
     */
    restoreOriginalAccessDenied() {
        if (this.originalAccessDenied) {
            this.keycloakInstance.accessDenied = this.originalAccessDenied;
        }
    }

    /**
     * Get the original accessDenied method
     */
    getOriginalAccessDenied() {
        return this.originalAccessDenied;
    }
}

// Express route handler for /accessdenied
function setupAccessDeniedRoute(app, options = {}) {
    const {
        templatePath = path.join(__dirname, '..', 'views', 'access-denied.html'),
        companyName = 'Astute Industry',
        supportEmail = 'support@exampleorg.com',
        homeUrl = '/',
        loginUrl = '/login'
    } = options;
    // console.log('templatePath:', templatePath);

    app.get('/accessdenied', (req, res) => {
        // Check if request expects JSON (API request)
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            let context = {};

            // Decode context if provided
            if (req.query.context) {
                try {
                    context = JSON.parse(Buffer.from(req.query.context, 'base64').toString());
                } catch (e) {
                    console.error('Failed to decode access denied context:', e);
                }
            }

            return res.status(403).json({
                error: 'Access Denied',
                message: context.requiredRoles ?
                    `To ${context.action || 'access this resource'}, you need one of these roles: ${context.requiredRoles.join(', ')}` :
                    'You do not have permission to access this resource.',
                statusCode: 403,
                timestamp: new Date().toISOString(),
                path: req.originalUrl,
                method: req.method,
                context: context
            });
        }

        // For web requests, serve the HTML template
        try {
            let htmlContent = fs.readFileSync(templatePath, 'utf8');

            // Default context
            let context = {
                resource: req.originalUrl,
                requiredRoles: ['admin'],
                userRoles: [],
                action: 'access this resource',
                timestamp: new Date().toISOString(),
                userAgent: req.get('User-Agent'),
                ip: req.ip || req.connection.remoteAddress
            };

            // Decode context if provided
            if (req.query.context) {
                try {
                    const decodedContext = JSON.parse(Buffer.from(req.query.context, 'base64').toString());
                    context = { ...context, ...decodedContext };
                } catch (e) {
                    console.error('Failed to decode access denied context:', e);
                }
            }

            // Generate dynamic message
            const dynamicMessage = context.requiredRoles.length > 0 ?
                `To ${context.action}, you need one of these roles: <strong>${context.requiredRoles.join(', ')}</strong>` :
                'You do not have the required permissions to access this resource.';

            const hasUserRoles = context.userRoles && context.userRoles.length > 0;
            const currentRolesMessage = hasUserRoles ?
                `Your current roles: <strong>${context.userRoles.join(', ')}</strong>` :
                'You are not assigned any roles or not properly authenticated.';

            // Replace placeholders in HTML
            htmlContent = htmlContent
                .replace(/{{COMPANY_NAME}}/g, companyName)
                .replace(/{{SUPPORT_EMAIL}}/g, supportEmail)
                .replace(/{{HOME_URL}}/g, homeUrl)
                .replace(/{{LOGIN_URL}}/g, loginUrl)
                .replace(/{{DYNAMIC_MESSAGE}}/g, dynamicMessage)
                .replace(/{{CURRENT_ROLES_MESSAGE}}/g, currentRolesMessage)
                .replace(/{{REQUESTED_RESOURCE}}/g, context.resource)
                .replace(/{{TIMESTAMP}}/g, new Date(context.timestamp).toLocaleString())
                .replace(/{{USER_AGENT}}/g, context.userAgent || 'Unknown')
                .replace(/{{SESSION_ID}}/g, req.sessionID || Math.random().toString(36).substr(2, 9));

            res.status(403).send(htmlContent);
        } catch (error) {
            console.error('Error serving access denied page:', error);

            // Fallback response
            res.status(403).json({
                error: 'Access Denied',
                message: 'You do not have permission to access this resource.',
                statusCode: 403,
                timestamp: new Date().toISOString()
            });
        }
    });
}

// Usage example:
/*
const Keycloak = require('keycloak-connect');
const { KeycloakAccessDeniedWrapper, setupAccessDeniedRoute } = require('./keycloak-wrapper');

// Initialize Keycloak
const keycloak = new Keycloak(memoryStore, keycloakConfig);

// Wrap the Keycloak instance
const keycloakWrapper = new KeycloakAccessDeniedWrapper(keycloak);

// Use the wrapped instance
app.use(keycloakWrapper.getKeycloakInstance().middleware());

// Set up the access denied route with custom options
setupAccessDeniedRoute(app, {
  templatePath: './templates/access-denied.html',
  companyName: 'Acme Corporation',
  supportEmail: 'help@acme.com',
  homeUrl: '/dashboard',
  loginUrl: '/auth/login'
});
*/

module.exports = {
    KeycloakAccessDeniedWrapper,
    setupAccessDeniedRoute
};