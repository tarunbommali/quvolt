const { getRedisClient } = require('../config/redis');

let redisClient = null;
const memSessions = new Map();
const memAnswerLocks = new Map();

const SESSION_TTL_SECONDS = 7200;
const ANSWER_LOCK_TTL_MS = 10 * 60 * 1000;

const sessionKey = (code) => `quiz:session:${code}`;
const lockKey = (code, questionIndex, userId) => `quiz:lock:${code}:${questionIndex}:${userId}`;

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

module.exports = {
    getSession,
    setSession,
    deleteSession,
    acquireAnswerLock,
};