/**
 * AI Result Caching Layer (Redis-backed)
 */
const { getRedisClient } = require('../../../config/redis');
const logger = require('../../../utils/logger');
const crypto = require('crypto');

const CACHE_TTL_SECONDS = 3600 * 24; // 24 hours
const CACHE_PREFIX = 'ai_cache:';

const generateCacheKey = ({ topic, difficulty, count }) => {
    const raw = `${topic.toLowerCase()}:${difficulty.toLowerCase()}:${count}`;
    const hash = crypto.createHash('md5').update(raw).digest('hex');
    return `${CACHE_PREFIX}${hash}`;
};

const getCachedQuestions = async (params) => {
    try {
        const redis = getRedisClient();
        if (!redis?.isOpen) return null;

        const key = generateCacheKey(params);
        const cached = await redis.get(key);
        
        if (cached) {
            logger.debug('AI Cache Hit', { topic: params.topic });
            return JSON.parse(cached);
        }
    } catch (error) {
        logger.warn('AI Cache Read Error', { error: error.message });
    }
    return null;
};

const setCachedQuestions = async (params, questions) => {
    try {
        const redis = getRedisClient();
        if (!redis?.isOpen) return;

        const key = generateCacheKey(params);
        await redis.set(key, JSON.stringify(questions), {
            EX: CACHE_TTL_SECONDS
        });
        logger.debug('AI Cache Written', { topic: params.topic });
    } catch (error) {
        logger.warn('AI Cache Write Error', { error: error.message });
    }
};

module.exports = {
    getCachedQuestions,
    setCachedQuestions,
};
