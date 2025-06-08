const express = require('express');
const { body, validationResult } = require('express-validator');
const { ValidationError } = require('../../../common/errors');
const { createRoleBasedProtection } = require('../../auth/middleware/keycloak-protection');

module.exports = (keycloak, roleService) => {
    const router = express.Router();
    // Initialize protection middleware with API-specific options
    const auth = createRoleBasedProtection(keycloak, {
        unauthorizedMessage: 'Authentication required to access role management API',
        forbiddenMessage: 'Admin privileges required to manage roles',
        jsonResponse: true, // Force JSON responses for API routes
        logUnauthorized: true,
        customErrorHandler: (error, req, res, next) => {
            // Pass custom errors to global error handler
            if (error.message?.includes('Access denied') || error.status === 403) {
                const { AuthorizationError } = require('../../../common/errors');
                next(new AuthorizationError('Admin privileges required to manage roles'));
            } else {
                const { AuthenticationError } = require('../../../common/errors');
                next(new AuthenticationError('Authentication required to access role management API'));
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

    // Get all realm roles
    router.get('/',
        auth.requireRole('realm:admin'),
        async (req, res, next) => {
            try {
                const roles = await roleService.getRoles();
                res.json(roles);
            } catch (error) {
                next(error);
            }
        }
    );

    // Create new realm role
    router.post('/',
        auth.requireRole('realm:admin'),
        [
            body('name').notEmpty().trim()
                .withMessage('Role name is required'),
            body('description').optional().trim()
        ],
        validate,
        async (req, res, next) => {
            try {
                const role = await roleService.createRole(req.body);
                res.status(201).json(role);
            } catch (error) {
                next(error);
            }
        }
    );

    // Get client roles
    router.get('/clients/:clientId/roles',
        auth.requireRole('realm:admin'),
        async (req, res, next) => {
            try {
                const roles = await roleService.getClientRoles(req.params.clientId);
                res.json(roles);
            } catch (error) {
                next(error);
            }
        }
    );

    // Create client role
    router.post('/clients/:clientId/roles',
        auth.requireRole('realm:admin'),
        [
            body('name').notEmpty().trim()
                .withMessage('Role name is required'),
            body('description').optional().trim()
        ],
        validate,
        async (req, res, next) => {
            try {
                const role = await roleService.createClientRole(req.params.clientId, req.body);
                res.status(201).json(role);
            } catch (error) {
                next(error);
            }
        }
    );

    // Assign realm roles to user
    router.post('/users/:userId/roles',
        auth.requireRole('realm:admin'),
        [
            body('roles').isArray()
                .withMessage('Roles must be an array')
        ],
        validate,
        async (req, res, next) => {
            try {
                await roleService.assignUserRoles(req.params.userId, req.body.roles);
                res.json({ message: 'Roles assigned successfully' });
            } catch (error) {
                next(error);
            }
        }
    );

    // Assign client roles to user
    router.post('/users/:userId/clients/:clientId/roles',
        auth.requireRole('realm:admin'),
        [
            body('roles').isArray()
                .withMessage('Roles must be an array'),
            body('roles.*.id').notEmpty()
                .withMessage('Role ID is required'),
            body('roles.*.name').notEmpty()
                .withMessage('Role name is required')
        ],
        validate,
        async (req, res, next) => {
            try {
                await roleService.assignClientRoles(
                    req.params.userId,
                    req.params.clientId,
                    req.body.roles
                );
                res.json({ message: 'Client roles assigned successfully' });
            } catch (error) {
                next(error);
            }
        }
    );

    return router;
};