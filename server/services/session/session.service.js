const { getRedisClient } = require('../../config/redis');
const logger = require('../../utils/logger');

let redisClient = null;
const memSessions = new Map();
const memAnswerLocks = new Map();

const SESSION_TTL_SECONDS = 7200;
const ANSWER_LOCK_TTL_MS = 10 * 60 * 1000;

/**
 * Sharded Redis Keys for scalability (Requirement: Final 5% Blueprint)
 */
const sessionKey = (code, sub = 'meta') => `quiz:session:${code}:${sub}`;
const seqKey = (code) => `quiz:session:${code}:seq`;
const lockKey = (code, questionIndex, userId) => `quiz:lock:${code}:${questionIndex}:${userId}`;
const zsetKey = 'quiz:active_timers';

const getRedisClientSafe = () => {
    if (redisClient) return redisClient;
    try {
        redisClient = getRedisClient();
        return redisClient;
    } catch {
        return null;
    }
};

/**
 * Transparently merge sharded session data (meta, participants, leaderboard)
 */
const getSession = async (code) => {
    const client = getRedisClientSafe();
    if (!client) return memSessions.get(code) || null;

    try {
        // Fetch shards in parallel for performance
        const [metaRaw, participantsRaw, leaderboardRaw] = await Promise.all([
            client.get(sessionKey(code, 'meta')),
            client.get(sessionKey(code, 'participants')),
            client.get(sessionKey(code, 'leaderboard'))
        ]);

        if (!metaRaw) {
            // Fallback: check legacy key for one-time migration
            const legacyRaw = await client.get(`quiz:session:${code}`);
            return legacyRaw ? JSON.parse(legacyRaw) : null;
        }

        const session = JSON.parse(metaRaw);
        session.participants = participantsRaw ? JSON.parse(participantsRaw) : {};
        session.leaderboard = leaderboardRaw ? JSON.parse(leaderboardRaw) : {};
        
        return session;
    } catch (error) {
        logger.error('Redis getSession failed', { code, error: error.message });
        return memSessions.get(code) || null;
    }
};

/**
 * Split and save session data into shards to reduce hot-key contention
 */
const setSession = async (code, session) => {
    const client = getRedisClientSafe();
    if (!client) {
        memSessions.set(code, session);
        return;
    }

    const { participants, leaderboard, ...meta } = session;

    try {
        const pipeline = client.multi();
        
        pipeline.set(sessionKey(code, 'meta'), JSON.stringify(meta), { EX: SESSION_TTL_SECONDS });
        pipeline.set(sessionKey(code, 'participants'), JSON.stringify(participants || {}), { EX: SESSION_TTL_SECONDS });
        pipeline.set(sessionKey(code, 'leaderboard'), JSON.stringify(leaderboard || {}), { EX: SESSION_TTL_SECONDS });
        
        await pipeline.exec();
    } catch (error) {
        logger.error('Redis setSession failed', { code, error: error.message });
        memSessions.set(code, session);
    }
};

const incrementSequence = async (code) => {
    const client = getRedisClientSafe();
    if (client) {
        try {
            const seq = await client.incr(seqKey(code));
            await client.expire(seqKey(code), SESSION_TTL_SECONDS);
            return seq;
        } catch (error) {
            logger.warn('Failed to increment sequence in Redis', { code, error: error.message });
        }
    }
    
    const session = await getSession(code);
    if (!session) return 0;
    session.sequenceNumber = (session.sequenceNumber || 0) + 1;
    await setSession(code, session);
    return session.sequenceNumber;
};

const deleteSession = async (code) => {
    const client = getRedisClientSafe();
    if (client) {
        const keys = await client.keys(`quiz:session:${code}:*`);
        if (keys.length > 0) await client.del(keys);
        await client.del(`quiz:session:${code}`); // legacy key
    }
    memSessions.delete(code);
};

const acquireAnswerLock = async (roomCode, questionIndex, userId) => {
    const client = getRedisClientSafe();
    const key = lockKey(roomCode, questionIndex, userId);

    if (client) {
        const result = await client.set(key, '1', { NX: true, EX: 600 });
        return result === 'OK';
    }

    if (memAnswerLocks.has(key)) return false;
    memAnswerLocks.set(key, true);
    setTimeout(() => memAnswerLocks.delete(key), ANSWER_LOCK_TTL_MS).unref();
    return true;
};

const acquireJoinLock = async (roomCode, userId) => {
    const client = getRedisClientSafe();
    const key = `quiz:joinlock:${roomCode}:${userId}`;

    if (client) {
        const result = await client.set(key, '1', { NX: true, EX: 5 });
        return result === 'OK';
    }

    if (memAnswerLocks.has(key)) return false;
    memAnswerLocks.set(key, true);
    setTimeout(() => memAnswerLocks.delete(key), 5000).unref();
    return true;
};

const memTimers = new Map();

const registerDistributedTimer = async (roomCode, executeAtMs) => {
    const client = getRedisClientSafe();
    if (client) {
        await client.zAdd(zsetKey, { score: executeAtMs, value: roomCode });
        return;
    }
    memTimers.set(roomCode, executeAtMs);
};

const clearDistributedTimer = async (roomCode) => {
    const client = getRedisClientSafe();
    if (client) {
        await client.zRem(zsetKey, roomCode);
    }
    memTimers.delete(roomCode);
};

const getExpiredDistributedTimers = async (currentTimeMs) => {
    const client = getRedisClientSafe();
    if (client) {
        return await client.zRangeByScore(zsetKey, 0, currentTimeMs);
    }
    
    const expired = [];
    for (const [roomCode, executeAtMs] of memTimers.entries()) {
        if (executeAtMs <= currentTimeMs) {
            expired.push(roomCode);
        }
    }
    return expired;
};

const memTimerLocks = new Map();

const acquireTimerLock = async (roomCode, timestampMs) => {
    const key = `quiz:lock:timer:${roomCode}:${timestampMs}`;
    const client = getRedisClientSafe();
    if (client) {
        const result = await client.set(key, '1', { NX: true, EX: 30 });
        return result === 'OK';
    }

    if (memTimerLocks.has(key)) return false;
    memTimerLocks.set(key, true);
    setTimeout(() => memTimerLocks.delete(key), 30000).unref();
    return true;
};

const saveSnapshot = async (code, data) => {
    const { persistSessionUpdates } = require('./statePersistence');
    try {
        await persistSessionUpdates(code, {
            snapshot: {
                lastLeaderboard: data.leaderboard || [],
                participants: data.participants || [],
                takenAt: new Date()
            }
        });
        logger.info('Session snapshot saved', { code });
    } catch (err) {
        logger.error('Failed to save session snapshot', { code, error: err.message });
    }
};

module.exports = {
    getSession,
    setSession,
    incrementSequence,
    deleteSession,
    acquireAnswerLock,
    acquireJoinLock,
    registerDistributedTimer,
    clearDistributedTimer,
    getExpiredDistributedTimers,
    acquireTimerLock,
    saveSnapshot,
};