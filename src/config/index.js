require('dotenv').config();

module.exports = {
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development',
        baseUrl: process.env.LOGOUT_REDIRECT_URI || 'http://localhost:3000'
    },

    keycloak: {
        baseUrl: process.env.KEYCLOAK_BASE_URL || 'http://localhost:8080',
        realm: process.env.KEYCLOAK_REALM || 'DemoRealm',
        adminClientId: process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'robot-control-app',
        clientSecret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET,
        sessionSecret: process.env.SESSION_SECRET || 'my-session-secret',
        sessionMaxAge: 3600000 // 1 hour
    },

    cors: {
        origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
        credentials: true,
    },

    mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/keycloak-sessions',
        sessionCollection: 'sessions'
    },

    kafka: {
        clientId: 'keycloak-middleware',
        brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
        topics: {
            sensorData: 'sensor_data',
            roleEvents: 'role_events'
        }
    },

    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'json'
    },

    security: {
        apiKey: process.env.API_KEY,
        rateLimiting: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // limit each IP to 100 requests per windowMs
        }
    }
};