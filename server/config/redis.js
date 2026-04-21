const { createClient } = require('redis');

let redisClient = null;

const connectRedis = async () => {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';

    redisClient = createClient({ 
        url,
        socket: {
            reconnectStrategy: (retries) => {
                const maxRetries = process.env.NODE_ENV === 'development' ? 1 : 3;
                if (retries >= maxRetries) {
                    return new Error('Max retries reached');
                }
                return Math.min(retries * 50, 500);
            },
            connectTimeout: 5000 // 5 second timeout for initial connection
        }
    });

    let hasFailed = false;
    redisClient.on('error', (err) => {
        if (!hasFailed && err && err.message) {
            console.warn('[Redis] Error:', err.message);
        }
    });
    redisClient.on('connect', () => {
        hasFailed = false;
        console.log('[Redis] Connected');
    });
    redisClient.on('reconnecting', () => console.log('[Redis] Reconnecting...'));

    try {
        await redisClient.connect();
    } catch (err) {
        hasFailed = true;
        console.warn('[Redis] Initial connection failed, client will operate in fallback mode:', err.message);
        throw err;
    }
    return redisClient;
};

const getRedisClient = () => {
    if (!redisClient || !redisClient.isOpen) {
        throw new Error('Redis client not connected. Call connectRedis() first.');
    }
    return redisClient;
};

module.exports = { connectRedis, getRedisClient };