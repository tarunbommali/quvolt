const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: true });

const paymentsEnabled = String(process.env.PAYMENTS_ENABLED || 'true').toLowerCase() === 'true';
const isProduction = (process.env.NODE_ENV || 'development') === 'production';
const mockPaymentsEnabled = !paymentsEnabled &&
    !isProduction &&
    String(process.env.MOCK_PAYMENTS_ENABLED || 'true').toLowerCase() === 'true';

const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'WEBHOOK_SECRET',
];

if (paymentsEnabled) {
    requiredEnvVars.push('RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET');
}

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error(`[Config Error] Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
}

if (isProduction && process.env.JWT_SECRET === 'your_jwt_secret_here') {
    console.error('[Config Error] JWT_SECRET must not use the default placeholder in production.');
    process.exit(1);
}

const config = {
    port: process.env.PAYMENT_SERVICE_PORT || process.env.PORT || 5001,
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: process.env.DATABASE_URL,
    paymentsEnabled,
    mockPaymentsEnabled,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.WEBHOOK_SECRET,
    platformFeePercent: Number(process.env.PLATFORM_FEE_PERCENT || 20),
    routeSplitEnabled: String(process.env.ROUTE_SPLIT_ENABLED || 'true').toLowerCase() === 'true',
    jwtSecret: process.env.JWT_SECRET,
    corsOrigin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173', 'http://localhost:5000']
};

module.exports = config;
