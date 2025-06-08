const express = require('express');
const { body, validationResult } = require('express-validator');
const { ValidationError } = require('../../../common/errors');
const { createRoleBasedProtection } = require('../../auth/middleware/keycloak-protection');
module.exports = (keycloak, clientService) => {
    const router = express.Router();
    // Initialize protection middleware with API-specific options
    const auth = createRoleBasedProtection(keycloak, {
        unauthorizedMessage: 'Authentication required to access client management API',
        forbiddenMessage: 'Admin privileges required to manage clients',
        jsonResponse: true, // Force JSON responses for API routes
        logUnauthorized: true,
        customErrorHandler: (error, req, res, next) => {
            // Pass custom errors to global error handler
            if (error.message?.includes('Access denied') || error.status === 403) {
                const { AuthorizationError } = require('../../../common/errors');
                next(new AuthorizationError('Admin privileges required to manage clients'));
            } else {
                const { AuthenticationError } = require('../../../common/errors');
                next(new AuthenticationError('Authentication required to access client management API'));
            }
        }
    });
    // Middleware to handle validation errors
    const validate = (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ValidationError(errors.array()[0].msg);
        }
        next();
    };

    // Get all clients
    router.get('/',
        auth.requireRole('realm:admin'),
        async (req, res, next) => {
            try {
                const clients = await clientService.getClients(req.query);
                res.json(clients);
            } catch (error) {
                next(error);
            }
        }
    );

    // Get client by ID
    router.get('/:clientId',
        auth.requireRole('realm:admin'),
        async (req, res, next) => {
            try {
                const client = await clientService.getClient(req.params.clientId);
                res.json(client);
            } catch (error) {
                next(error);
            }
        }
    );

    // Create new client
    router.post('/',
        auth.requireRole('realm:admin'),
        [
            body('clientId').notEmpty().trim()
                .withMessage('Client ID is required'),
            body('name').notEmpty().trim()
                .withMessage('Client name is required'),
            body('description').optional().trim(),
            body('enabled').isBoolean()
                .withMessage('Enabled status must be a boolean')
        ],
        validate,
        async (req, res, next) => {
            try {
                const client = await clientService.createClient(req.body);
                res.status(201).json(client);
            } catch (error) {
                next(error);
            }
        }
    );

    // Update client
    router.put('/:clientId',
        auth.requireRole('realm:admin'),
        [
            body('name').optional().trim(),
            body('description').optional().trim(),
            body('enabled').optional().isBoolean()
                .withMessage('Enabled status must be a boolean')
        ],
        validate,
        async (req, res, next) => {
            try {
                await clientService.updateClient(req.params.clientId, req.body);
                res.json({ message: 'Client updated successfully' });
            } catch (error) {
                next(error);
            }
        }
    );

    // Delete client
    router.delete('/:clientId',
        auth.requireRole('realm:admin'),
        async (req, res, next) => {
            try {
                await clientService.deleteClient(req.params.clientId);
                res.json({ message: 'Client deleted successfully' });
            } catch (error) {
                next(error);
            }
        }
    );

    // Get client secret
    router.get('/:clientId/client-secret',
        auth.requireRole('realm:admin'),
        async (req, res, next) => {
            try {
                const secret = await clientService.getClientSecret(req.params.clientId);
                res.json(secret);
            } catch (error) {
                next(error);
            }
        }
    );

    // Regenerate client secret
    router.post('/:clientId/client-secret',
        auth.requireRole('realm:admin'),
        async (req, res, next) => {
            try {
                const secret = await clientService.regenerateClientSecret(req.params.clientId);
                res.json(secret);
            } catch (error) {
                next(error);
            }
        }
    );

    return router;
};