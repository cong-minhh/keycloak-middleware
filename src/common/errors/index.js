class AppError extends Error {
    constructor(message, statusCode = 500, errorCode = 'INTERNAL_SERVER_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message) {
        super(message, 400, 'VALIDATION_ERROR');
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'Insufficient permissions') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}

class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
    }
}

class ConflictError extends AppError {
    constructor(message) {
        super(message, 409, 'CONFLICT_ERROR');
    }
}

class ServiceError extends AppError {
    constructor(service, message) {
        super(`${service} service error: ${message}`, 500, 'SERVICE_ERROR');
    }
}

class DatabaseError extends AppError {
    constructor(message) {
        super(`Database error: ${message}`, 500, 'DATABASE_ERROR');
    }
}

class KeycloakError extends AppError {
    constructor(message) {
        super(`Keycloak error: ${message}`, 500, 'KEYCLOAK_ERROR');
    }
}

class KafkaError extends AppError {
    constructor(message) {
        super(`Kafka error: ${message}`, 500, 'KAFKA_ERROR');
    }
}

module.exports = {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    ServiceError,
    DatabaseError,
    KeycloakError,
    KafkaError
};