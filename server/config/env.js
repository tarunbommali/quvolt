const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: true });

const isProduction = (process.env.NODE_ENV || 'development') === 'production';

const requiredEnvVars = [
    'MONGO_URI',
    'JWT_SECRET',
    'REDIS_URL',
    'CLIENT_URL'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error(`[Config Error] Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
}

if (isProduction && process.env.JWT_SECRET === 'your_jwt_secret_here') {
    console.error('[Config Error] JWT_SECRET must not use the default placeholder in production.');
    process.exit(1);
}

if (isProduction && !process.env.JWT_REFRESH_SECRET) {
    console.warn('[Config Warning] JWT_REFRESH_SECRET is not set. Falling back to JWT_SECRET. ' +
        'For stronger security, set a separate JWT_REFRESH_SECRET in production.');
}

const config = {
    port: process.env.SERVER_PORT || process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    redisUrl: process.env.REDIS_URL,
    clientUrl: process.env.CLIENT_URL.split(',').map((value) => value.trim()).filter(Boolean),
    paymentServiceUrl: process.env.PAYMENT_SERVICE_URL || 'http://localhost:5001'
};

module.exports = config;
