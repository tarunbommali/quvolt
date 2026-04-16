const { getRedisClient } = require('../../config/redis');

let redisClient = null;
const memSessions = new Map();
const memAnswerLocks = new Map();

const SESSION_TTL_SECONDS = 7200;
const ANSWER_LOCK_TTL_MS = 10 * 60 * 1000;

const sessionKey = (code) => `quiz:session:${code}`;
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

const getSession = async (code) => {
    const client = getRedisClientSafe();
    if (client) {
        const raw = await client.get(sessionKey(code));
        return raw ? JSON.parse(raw) : null;
    }

    return memSessions.get(code) || null;
};

const setSession = async (code, session) => {
    const client = getRedisClientSafe();
    if (client) {
        await client.set(sessionKey(code), JSON.stringify(session), { EX: SESSION_TTL_SECONDS });
        return;
    }

    memSessions.set(code, session);
};

const deleteSession = async (code) => {
    const client = getRedisClientSafe();
    if (client) {
        await client.del(sessionKey(code));
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
    // Cleanup old locks after 30s
    setTimeout(() => memTimerLocks.delete(key), 30000).unref();
    return true;
};

module.exports = {
    getSession,
    setSession,
    deleteSession,
    acquireAnswerLock,
    registerDistributedTimer,
    clearDistributedTimer,
    getExpiredDistributedTimers,
    acquireTimerLock,
};