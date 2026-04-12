const { createClient } = require('redis');

let redisClient = null;

const connectRedis = async () => {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';

    redisClient = createClient({ url });

    redisClient.on('error', (err) => console.error('[Redis] Error:', err.message));
    redisClient.on('connect', () => console.log('[Redis] Connected'));
    redisClient.on('reconnecting', () => console.log('[Redis] Reconnecting...'));

    await redisClient.connect();
    return redisClient;
};

const getRedisClient = () => {
    if (!redisClient || !redisClient.isOpen) {
        throw new Error('Redis client not connected. Call connectRedis() first.');
    }
    return redisClient;
};

module.exports = { connectRedis, getRedisClient };