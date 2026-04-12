const test = require('node:test');
const assert = require('node:assert/strict');
const {
    SESSION_STATUS,
    canTransition,
    assertTransition,
    assertWaitingSessionExists,
} = require('../utils/sessionStateMachine');

// --- allowed transitions ---

test('draft -> scheduled is allowed', () => {
    assert.equal(canTransition(SESSION_STATUS.DRAFT, SESSION_STATUS.SCHEDULED), true);
    assert.doesNotThrow(() => assertTransition(SESSION_STATUS.DRAFT, SESSION_STATUS.SCHEDULED, 'quiz'));
});

test('draft -> waiting is allowed', () => {
    assert.equal(canTransition(SESSION_STATUS.DRAFT, SESSION_STATUS.WAITING), true);
});

test('draft -> aborted is allowed', () => {
    assert.equal(canTransition(SESSION_STATUS.DRAFT, SESSION_STATUS.ABORTED), true);
});

test('scheduled -> waiting is allowed', () => {
    assert.equal(canTransition(SESSION_STATUS.SCHEDULED, SESSION_STATUS.WAITING), true);
});

test('scheduled -> aborted is allowed', () => {
    assert.equal(canTransition(SESSION_STATUS.SCHEDULED, SESSION_STATUS.ABORTED), true);
});

test('live -> completed is allowed', () => {
    assert.equal(canTransition(SESSION_STATUS.LIVE, SESSION_STATUS.COMPLETED), true);
    assert.doesNotThrow(() => assertTransition(SESSION_STATUS.LIVE, SESSION_STATUS.COMPLETED, 'session'));
});

test('live -> aborted is allowed', () => {
    assert.equal(canTransition(SESSION_STATUS.LIVE, SESSION_STATUS.ABORTED), true);
});

test('completed -> aborted is allowed', () => {
    assert.equal(canTransition(SESSION_STATUS.COMPLETED, SESSION_STATUS.ABORTED), true);
});

test('aborted -> waiting is allowed', () => {
    assert.equal(canTransition(SESSION_STATUS.ABORTED, SESSION_STATUS.WAITING), true);
    assert.doesNotThrow(() => assertTransition(SESSION_STATUS.ABORTED, SESSION_STATUS.WAITING, 'session'));
});

// --- blocked transitions ---

test('live -> draft is blocked', () => {
    assert.equal(canTransition(SESSION_STATUS.LIVE, SESSION_STATUS.DRAFT), false);
});

test('waiting -> draft is blocked', () => {
    assert.equal(canTransition(SESSION_STATUS.WAITING, SESSION_STATUS.DRAFT), false);
});

test('completed -> waiting is blocked', () => {
    assert.equal(canTransition(SESSION_STATUS.COMPLETED, SESSION_STATUS.WAITING), false);
});

test('aborted -> live is blocked', () => {
    assert.equal(canTransition(SESSION_STATUS.ABORTED, SESSION_STATUS.LIVE), false);
});

// --- identity and null edge cases ---

test('canTransition allows self-transition (same status)', () => {
    for (const status of Object.values(SESSION_STATUS)) {
        assert.equal(canTransition(status, status), true,
            `Expected self-transition ${status} -> ${status} to be allowed`);
    }
});

test('canTransition with null from is always allowed', () => {
    assert.equal(canTransition(null, SESSION_STATUS.WAITING), true);
    assert.equal(canTransition(null, SESSION_STATUS.LIVE), true);
});

test('canTransition with unknown from status returns false', () => {
    assert.equal(canTransition('unknown_status', SESSION_STATUS.LIVE), false);
});

// --- assertTransition error properties ---

test('assertTransition throws with INVALID_SESSION_TRANSITION error code', () => {
    let caughtError;
    try {
        assertTransition(SESSION_STATUS.COMPLETED, SESSION_STATUS.WAITING, 'quiz');
    } catch (err) {
        caughtError = err;
    }
    assert.ok(caughtError);
    assert.equal(caughtError.code, 'INVALID_SESSION_TRANSITION');
    assert.match(caughtError.message, /completed -> waiting/);
});

// --- assertWaitingSessionExists ---

test('assertWaitingSessionExists does not throw for a truthy session', () => {
    assert.doesNotThrow(() => assertWaitingSessionExists({ sessionCode: 'ABC123' }));
});

test('assertWaitingSessionExists throws WAITING_SESSION_REQUIRED for undefined', () => {
    let caughtError;
    try {
        assertWaitingSessionExists(undefined);
    } catch (err) {
        caughtError = err;
    }
    assert.ok(caughtError);
    assert.equal(caughtError.code, 'WAITING_SESSION_REQUIRED');
});
