const { createClient } = require('redis');

let redisClient = null;

const connectRedis = async () => {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';

    redisClient = createClient({ 
        url,
        socket: {
            reconnectStrategy: (retries) => {
                if (retries > 20) {
                    return new Error('Redis max retries reached');
                }
                // Exponential backoff: 100ms, 200ms, 400ms... up to 3 seconds
                return Math.min(retries * 100, 3000);
            },
            connectTimeout: 10000,
            keepAlive: 5000,
        }
    });

    redisClient.on('error', (err) => {
        console.error('[Redis] Error:', err);
    });
    
    redisClient.on('connect', () => {
        console.log('[Redis] Connected successfully');
    });
    
    redisClient.on('reconnecting', () => {
        console.log('[Redis] Connection lost. Reconnecting...');
    });

    try {
        await redisClient.connect();
    } catch (err) {
        console.error('[Redis] Critical: Initial connection failed:', err.message);
        // Do not throw here if we want fallback, but since it's "primary persistent store", 
        // in production we might actually want to fail fast or wait.
        if (process.env.NODE_ENV === 'production') {
            throw err;
        }
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