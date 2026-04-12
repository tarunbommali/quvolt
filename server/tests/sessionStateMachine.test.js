const test = require('node:test');
const assert = require('node:assert/strict');
const {
    SESSION_STATUS,
    normalizeSessionStatus,
    canTransition,
    assertTransition,
    assertWaitingSessionExists,
} = require('../utils/sessionStateMachine');

test('cannot go from draft to live directly', () => {
    assert.equal(canTransition(SESSION_STATUS.DRAFT, SESSION_STATUS.LIVE), false);
    assert.throws(
        () => assertTransition(SESSION_STATUS.DRAFT, SESSION_STATUS.LIVE, 'session'),
        /Invalid session state transition: draft -> live/
    );
});

test('cannot go from completed to live', () => {
    assert.equal(canTransition(SESSION_STATUS.COMPLETED, SESSION_STATUS.LIVE), false);
    assert.throws(
        () => assertTransition(SESSION_STATUS.COMPLETED, SESSION_STATUS.LIVE, 'session'),
        /Invalid session state transition: completed -> live/
    );
});

test('cannot join waiting without session', () => {
    assert.throws(
        () => assertWaitingSessionExists(null),
        /Cannot join waiting without session/
    );
});

test('allows waiting to live transition', () => {
    assert.equal(canTransition(SESSION_STATUS.WAITING, SESSION_STATUS.LIVE), true);
    assert.doesNotThrow(() => assertTransition(SESSION_STATUS.WAITING, SESSION_STATUS.LIVE, 'session'));
});

test('normalizes legacy upcoming and ongoing statuses', () => {
    assert.equal(normalizeSessionStatus('upcoming'), SESSION_STATUS.DRAFT);
    assert.equal(normalizeSessionStatus('ongoing'), SESSION_STATUS.WAITING);
    assert.equal(canTransition('upcoming', SESSION_STATUS.WAITING), true);
    assert.equal(canTransition('ongoing', SESSION_STATUS.LIVE), true);
});
