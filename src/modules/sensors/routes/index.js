const express = require('express');
const { body, validationResult } = require('express-validator');
const { ValidationError } = require('../../../common/errors');
const { createRoleBasedProtection } = require('../../auth/middleware/keycloak-protection');

module.exports = (keycloak, sensorService) => {
    const router = express.Router();
    // Initialize protection middleware with API-specific options
    const auth = createRoleBasedProtection(keycloak, {
        unauthorizedMessage: 'Authentication required to access sensor management API',
        forbiddenMessage: 'Sensor writer privileges required to manage sensors',
        jsonResponse: true, // Force JSON responses for API routes
        logUnauthorized: true,
        customErrorHandler: (error, req, res, next) => {
            // Pass custom errors to global error handler
            if (error.message?.includes('Access denied') || error.status === 403) {
                const { AuthorizationError } = require('../../../common/errors');
                next(new AuthorizationError('Sensor writer privileges required to manage users'));
            } else {
                const { AuthenticationError } = require('../../../common/errors');
                next(new AuthenticationError('Authentication required to access sensor management API'));
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

    // Get sensor data
    router.get('/',
        auth.requireRole('robot-control-app:sensor_reader'),
        async (req, res, next) => {
            try {
                const data = await sensorService.getSensorData();
                res.json(data);
            } catch (error) {
                next(error);
            }
        }
    );

    // Get historical sensor data
    router.get('/history',
        auth.requireRole('robot-control-app:sensor_reader'),
        async (req, res, next) => {
            try {
                const data = await sensorService.getSensorHistory({
                    startTime: req.query.startTime,
                    endTime: req.query.endTime
                });
                res.json(data);
            } catch (error) {
                next(error);
            }
        }
    );

    // Update sensor data
    router.post('/',
        auth.requireRole('robot-control-app:sensor_writer'),
        [
            body('temperature').isFloat({ min: -50, max: 100 })
                .withMessage('Temperature must be between -50°C and 100°C'),
            body('humidity').isFloat({ min: 0, max: 100 })
                .withMessage('Humidity must be between 0% and 100%'),
            body('pressure').isFloat({ min: 800, max: 1200 })
                .withMessage('Pressure must be between 800hPa and 1200hPa'),
            body('timestamp').optional().isISO8601()
                .withMessage('Invalid timestamp format')
        ],
        validate,
        async (req, res, next) => {
            try {
                await sensorService.recordSensorData(req.body);
                res.json({ message: 'Sensor data recorded successfully' });
            } catch (error) {
                next(error);
            }
        }
    );

    // Connect to sensor stream
    router.post('/connect',
        auth.requireRole('robot-control-app:sensor_writer'),
        async (req, res, next) => {
            try {
                await sensorService.connect();
                res.json({ message: 'Connected to sensor stream' });
            } catch (error) {
                next(error);
            }
        }
    );

    // Disconnect from sensor stream
    router.post('/disconnect',
        auth.requireRole('robot-control-app:sensor_writer'),
        async (req, res, next) => {
            try {
                await sensorService.disconnect();
                res.json({ message: 'Disconnected from sensor stream' });
            } catch (error) {
                next(error);
            }
        }
    );

    return router;
};