const { AuthenticationError, AuthorizationError } = require('../../../common/errors');

const createProtectionMiddleware = (keycloak, options = {}) => {
    const {
        unauthorizedMessage = 'Access denied. Please log in to continue.',
        forbiddenMessage = 'You do not have permission to access this resource.',
        redirectUrl = '/login',
        jsonResponse = false,
        customErrorHandler = null,
        logUnauthorized = true
    } = options;

    return (requiredRoles = []) => {
        // Convert single role to array for consistency
        const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

        return async (req, res, next) => {
            try {
                // Apply Keycloak protection with roles if specified
                await new Promise((resolve, reject) => {
                    keycloak.protect()(req, res, (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                });

                // After authentication, manually check roles
                const token = req.kauth?.grant?.access_token?.content;
                const userRoles = token?.realm_access?.roles || [];

                const hasRequiredRole = roles.every(role => {
                    const [source, roleName] = role.split(':');
                    if (source === 'realm') {
                        return userRoles.includes(roleName);
                    } else if (token?.resource_access?.[source]?.roles) {
                        return token.resource_access[source].roles.includes(roleName);
                    }
                    return false;
                });

                if (!hasRequiredRole) {
                    throw new AuthorizationError(forbiddenMessage);
                }

                // If we reach here, user is authorized
                next();

            } catch (error) {
                // Log unauthorized access attempts if enabled
                if (logUnauthorized) {
                    console.warn(`Unauthorized access attempt to ${req.path}`, {
                        ip: req.ip,
                        userAgent: req.get('User-Agent'),
                        timestamp: new Date().toISOString(),
                        requiredRoles: roles,
                        error: error.message
                    });
                }

                // Use custom error handler if provided
                if (customErrorHandler) {
                    return customErrorHandler(error, req, res, next);
                }

                // Transform keycloak errors to custom error types
                let customError;
                if (error.message?.includes('Access denied') || error.status === 403) {
                    customError = new AuthorizationError(forbiddenMessage);
                } else {
                    customError = new AuthenticationError(unauthorizedMessage);
                }

                // Handle the custom error based on response type
                return handleCustomError(customError, req, res, jsonResponse, redirectUrl);
            }
        };
    };
};

// Helper function to handle custom errors
const handleCustomError = (error, req, res, jsonResponse, redirectUrl) => {
    const isAuthError = error instanceof AuthenticationError;
    const isAuthzError = error instanceof AuthorizationError;

    if (jsonResponse || req.headers.accept?.includes('application/json')) {
        
        return res.status(error.statusCode).json({
            error: error.status,
            message: error.message,
            code: error.errorCode,
            ...(isAuthError && { loginUrl: redirectUrl })
        });
    }

    // For authentication errors (401), redirect to login
    if (isAuthError && redirectUrl) {
        const returnUrl = encodeURIComponent(req.originalUrl);
        return res.redirect(`${redirectUrl}?return=${returnUrl}`);
    }

    // For authorization errors (403) or when no redirect URL, show error page
    const title = isAuthError ? 'Authentication Required' : 'Access Forbidden';
    const actionLink = isAuthError
        ? `<a href="${redirectUrl || '/'}">Click here to log in</a>`
        : '<a href="/">Return to Home</a>';

    return res.status(error.statusCode).send(`
    <html>
      <head><title>${title}</title></head>
      <body>
        <h1>${title}</h1>
        <p>${error.message}</p>
        ${isAuthzError ? '<p>Contact your administrator if you believe this is an error.</p>' : ''}
        ${actionLink}
      </body>
    </html>
  `);
};

// Enhanced middleware factory with role-based protection
const createRoleBasedProtection = (keycloak, options = {}) => {
    const baseMiddleware = createProtectionMiddleware(keycloak, options);

    return {
        // Basic protection (just authentication required)
        authenticate: baseMiddleware(),

        // Role-based protection
        requireRole: (role) => baseMiddleware(role),
        requireRoles: (roles) => baseMiddleware(roles),

        // Common role shortcuts
        requireAdmin: baseMiddleware(['admin']),
        requireUser: baseMiddleware(['user']),
        requireModerator: baseMiddleware(['moderator']),

        // Custom protection with inline options
        custom: (roles, customOptions = {}) => {
            const mergedOptions = { ...options, ...customOptions };
            return createProtectionMiddleware(keycloak, mergedOptions)(roles);
        }
    };
};

module.exports = {
    createProtectionMiddleware,
    createRoleBasedProtection
};