// const rateLimit = require('express-rate-limit');
const { ValidationError, AuthenticationError } = require('../errors');
const config = require('../../config');

const errorHandler = (err, req, res, next) => {
    console.error(err);

    if (err.isOperational) {
        return res.status(err.statusCode).json({
            status: err.status,
            errorCode: err.errorCode,
            message: err.message
        });
    }

    // Programming or unknown errors
    return res.status(500).json({
        status: 'error',
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong'
    });
};

const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            const { error } = schema.validate(req.body);
            if (error) {
                throw new ValidationError(error.details[0].message);
            }
            next();
        } catch (err) {
            next(err);
        }
    };
};

const apiKeyAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!config.security.apiKey) {
        console.error('API_KEY environment variable is not configured');
        return next(new Error('API key configuration error'));
    }

    if (!apiKey) {
        return next(new AuthenticationError('API key is required'));
    }

    if (apiKey !== config.security.apiKey) {
        return next(new AuthenticationError('Invalid API key'));
    }

    next();
};

// const rateLimiter = rateLimit({
//     windowMs: config.security.rateLimiting.windowMs,
//     max: config.security.rateLimiting.max,
//     message: {
//         status: 'error',
//         errorCode: 'RATE_LIMIT_EXCEEDED',
//         message: 'Too many requests, please try again later.'
//     }
// });

const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log({
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('user-agent'),
            ip: req.ip
        });
    });
    next();
};

const securityHeaders = (req, res, next) => {
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self';"
    });
    next();
};

module.exports = {
    errorHandler,
    validateRequest,
    apiKeyAuth,
    // rateLimiter,
    requestLogger,
    securityHeaders
};