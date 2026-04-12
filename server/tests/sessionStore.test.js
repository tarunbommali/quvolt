const test = require('node:test');
const assert = require('node:assert/strict');

// session.service uses an in-memory fallback when Redis is unavailable.
// Requiring the module before any Redis connection is established exercises
// the memSessions / memAnswerLocks code paths.
const sessionStore = require('../services/session.service');

const uniqueCode = (prefix = 'room') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

test('setSession and getSession round-trip stores and retrieves session data', async () => {
    const code = uniqueCode();
    const data = { quizId: 'q1', participants: [], currentQuestion: 0 };

    await sessionStore.setSession(code, data);
    const retrieved = await sessionStore.getSession(code);

    assert.deepEqual(retrieved, data);
});

test('getSession returns null for an unknown room code', async () => {
    const result = await sessionStore.getSession('DOES_NOT_EXIST');
    assert.equal(result, null);
});

test('setSession overwrites existing session data', async () => {
    const code = uniqueCode();

    await sessionStore.setSession(code, { status: 'waiting' });
    await sessionStore.setSession(code, { status: 'live' });

    const result = await sessionStore.getSession(code);
    assert.equal(result.status, 'live');
});

test('deleteSession removes a stored session', async () => {
    const code = uniqueCode();

    await sessionStore.setSession(code, { status: 'live' });
    await sessionStore.deleteSession(code);

    const result = await sessionStore.getSession(code);
    assert.equal(result, null);
});

test('deleteSession on non-existent code does not throw', async () => {
    await assert.doesNotReject(() => sessionStore.deleteSession('NOT_THERE'));
});

test('acquireAnswerLock grants the first lock for a question', async () => {
    const code = uniqueCode();
    const acquired = await sessionStore.acquireAnswerLock(code, 0, 'user-a');
    assert.equal(acquired, true);
});

test('acquireAnswerLock blocks a duplicate lock for the same question and user', async () => {
    const code = uniqueCode();
    const userId = 'user-dup';

    const first = await sessionStore.acquireAnswerLock(code, 0, userId);
    const second = await sessionStore.acquireAnswerLock(code, 0, userId);

    assert.equal(first, true);
    assert.equal(second, false);
});

test('acquireAnswerLock allows different users to answer the same question', async () => {
    const code = uniqueCode();

    const a = await sessionStore.acquireAnswerLock(code, 1, 'userA');
    const b = await sessionStore.acquireAnswerLock(code, 1, 'userB');

    assert.equal(a, true);
    assert.equal(b, true);
});

test('acquireAnswerLock allows the same user to answer different questions', async () => {
    const code = uniqueCode();
    const userId = 'user-multi';

    const q0 = await sessionStore.acquireAnswerLock(code, 0, userId);
    const q1 = await sessionStore.acquireAnswerLock(code, 1, userId);

    assert.equal(q0, true);
    assert.equal(q1, true);
});
