const express = require('express');
const { body, validationResult } = require('express-validator');
const { ValidationError } = require('../../../common/errors');
const { createRoleBasedProtection } = require('../../auth/middleware/keycloak-protection');

module.exports = (keycloak, userService) => {
    const router = express.Router();

    // Middleware to handle validation errors
    const validate = (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ValidationError(errors.array()[0].msg);
        }
        next();
    };

    // Get all users
    router.get('/',
        keycloak.protect('realm:admin'),
        async (req, res, next) => {
            try {
                const users = await userService.getUsers();
                res.json({
                    success: true,
                    data: users,
                    count: users.length
                });
            } catch (error) {
                next(error);
            }
        }
    );

    // Get user by ID
    router.get('/:userId',
        keycloak.protect('realm:admin'),
        async (req, res, next) => {
            try {
                const user = await userService.getUser(req.params.userId);
                res.json({
                    success: true,
                    data: user
                });
            } catch (error) {
                next(error);
            }
        }
    );

    // Create new user
    router.post('/',
        keycloak.protect('realm:admin'),
        [
            body('username')
                .notEmpty()
                .withMessage('Username is required')
                .trim()
                .isLength({ min: 3 })
                .withMessage('Username must be at least 3 characters long'),
            body('email')
                .isEmail()
                .withMessage('Valid email is required')
                .normalizeEmail(),
            body('firstName')
                .notEmpty()
                .withMessage('First name is required')
                .trim()
                .isLength({ min: 1 })
                .withMessage('First name cannot be empty'),
            body('lastName')
                .notEmpty()
                .withMessage('Last name is required')
                .trim()
                .isLength({ min: 1 })
                .withMessage('Last name cannot be empty'),
            body('enabled')
                .isBoolean()
                .withMessage('Enabled status must be a boolean')
        ],
        validate,
        async (req, res, next) => {
            try {
                const user = await userService.createUser(req.body);
                res.status(201).json({
                    success: true,
                    message: 'User created successfully',
                    data: user
                });
            } catch (error) {
                next(error);
            }
        }
    );

    // Update user
    router.put('/:userId',
        keycloak.protect('realm:admin'),
        [
            body('email')
                .optional()
                .isEmail()
                .withMessage('Valid email is required')
                .normalizeEmail(),
            body('firstName')
                .optional()
                .trim()
                .isLength({ min: 1 })
                .withMessage('First name cannot be empty'),
            body('lastName')
                .optional()
                .trim()
                .isLength({ min: 1 })
                .withMessage('Last name cannot be empty'),
            body('enabled')
                .optional()
                .isBoolean()
                .withMessage('Enabled status must be a boolean')
        ],
        validate,
        async (req, res, next) => {
            try {
                const updatedUser = await userService.updateUser(req.params.userId, req.body);
                res.json({
                    success: true,
                    message: 'User updated successfully',
                    data: updatedUser
                });
            } catch (error) {
                next(error);
            }
        }
    );

    // Delete user
    router.delete('/:userId',
        keycloak.protect('realm:admin'),
        async (req, res, next) => {
            try {
                await userService.deleteUser(req.params.userId);
                res.json({
                    success: true,
                    message: 'User deleted successfully'
                });
            } catch (error) {
                next(error);
            }
        }
    );

    // Reset user password
    router.put('/:userId/reset-password',
        keycloak.protect('realm:admin'),
        [
            body('password')
                .isLength({ min: 8 })
                .withMessage('Password must be at least 8 characters long')
                .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
                .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
            body('temporary')
                .optional()
                .isBoolean()
                .withMessage('Temporary flag must be a boolean')
        ],
        validate,
        async (req, res, next) => {
            try {
                await userService.resetPassword(req.params.userId, {
                    value: req.body.password,
                    temporary: req.body.temporary !== undefined ? req.body.temporary : true
                });
                res.json({
                    success: true,
                    message: 'Password reset successfully'
                });
            } catch (error) {
                next(error);
            }
        }
    );

    // Additional routes for enhanced user management

    // Enable/Disable user
    router.patch('/:userId/status',
        keycloak.protect('realm:admin'),
        [
            body('enabled')
                .isBoolean()
                .withMessage('Enabled status must be a boolean')
        ],
        validate,
        async (req, res, next) => {
            try {
                await userService.updateUser(req.params.userId, {
                    enabled: req.body.enabled
                });
                res.json({
                    success: true,
                    message: `User ${req.body.enabled ? 'enabled' : 'disabled'} successfully`
                });
            } catch (error) {
                next(error);
            }
        }
    );

    // Get user roles
    router.get('/:userId/roles',
        keycloak.protect('realm:admin'),
        async (req, res, next) => {
            try {
                const roles = await userService.getUserRoles(req.params.userId);
                res.json({
                    success: true,
                    data: roles
                });
            } catch (error) {
                next(error);
            }
        }
    );

    // Assign roles to user
    router.post('/:userId/roles',
        keycloak.protect('realm:admin'),
        [
            body('roles')
                .isArray({ min: 1 })
                .withMessage('Roles must be a non-empty array'),
            body('roles.*')
                .isString()
                .withMessage('Each role must be a string')
        ],
        validate,
        async (req, res, next) => {
            try {
                await userService.assignRoles(req.params.userId, req.body.roles);
                res.json({
                    success: true,
                    message: 'Roles assigned successfully'
                });
            } catch (error) {
                next(error);
            }
        }
    );

    // Remove roles from user
    router.delete('/:userId/roles',
        keycloak.protect('realm:admin'),
        [
            body('roles')
                .isArray({ min: 1 })
                .withMessage('Roles must be a non-empty array'),
            body('roles.*')
                .isString()
                .withMessage('Each role must be a string')
        ],
        validate,
        async (req, res, next) => {
            try {
                await userService.removeRoles(req.params.userId, req.body.roles);
                res.json({
                    success: true,
                    message: 'Roles removed successfully'
                });
            } catch (error) {
                next(error);
            }
        }
    );

    // Bulk operations
    router.post('/bulk/delete',
        keycloak.protect('realm:admin'),
        [
            body('userIds')
                .isArray({ min: 1 })
                .withMessage('User IDs must be a non-empty array'),
            body('userIds.*')
                .isString()
                .withMessage('Each user ID must be a string')
        ],
        validate,
        async (req, res, next) => {
            try {
                const results = await userService.bulkDeleteUsers(req.body.userIds);
                res.json({
                    success: true,
                    message: 'Bulk delete operation completed',
                    data: results
                });
            } catch (error) {
                next(error);
            }
        }
    );

    return router;
};