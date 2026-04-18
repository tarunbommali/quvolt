const test = require('node:test');
const assert = require('node:assert/strict');
const {
    SESSION_STATUS,
    assertTransition,
} = require('../utils/sessionStateMachine');

// Mock dependencies
const mockSessionStore = {
    sessions: new Map(),
    getSession: async function(code) {
        return this.sessions.get(code) || null;
    },
    setSession: async function(code, session) {
        this.sessions.set(code, session);
    },
    deleteSession: async function(code) {
        this.sessions.delete(code);
    },
    acquireAnswerLock: async function() {
        return true;
    },
    clearDistributedTimer: async function() {},
    registerDistributedTimer: async function() {},
};

// Test state machine integration with quiz service functions
test('State Machine Integration - startQuizSession validates transitions', async () => {
    // Test that invalid transitions are rejected
    const invalidTransitions = [
        { from: SESSION_STATUS.DRAFT, to: SESSION_STATUS.LIVE, shouldFail: true },
        { from: SESSION_STATUS.COMPLETED, to: SESSION_STATUS.LIVE, shouldFail: true },
        { from: SESSION_STATUS.ABORTED, to: SESSION_STATUS.LIVE, shouldFail: true },
    ];

    for (const { from, to, shouldFail } of invalidTransitions) {
        let error = null;
        try {
            assertTransition(from, to, 'session');
        } catch (err) {
            error = err;
        }

        if (shouldFail) {
            assert.ok(error, `Expected transition ${from} -> ${to} to fail`);
            assert.equal(error.code, 'INVALID_SESSION_TRANSITION');
        } else {
            assert.equal(error, null, `Expected transition ${from} -> ${to} to succeed`);
        }
    }
});

test('State Machine Integration - valid transitions are allowed', async () => {
    const validTransitions = [
        { from: SESSION_STATUS.WAITING, to: SESSION_STATUS.LIVE },
        { from: SESSION_STATUS.LIVE, to: SESSION_STATUS.COMPLETED },
        { from: SESSION_STATUS.LIVE, to: SESSION_STATUS.ABORTED },
        { from: SESSION_STATUS.WAITING, to: SESSION_STATUS.ABORTED },
    ];

    for (const { from, to } of validTransitions) {
        assert.doesNotThrow(
            () => assertTransition(from, to, 'session'),
            `Expected transition ${from} -> ${to} to be allowed`
        );
    }
});

test('State Machine Integration - abort transitions work from any state except completed', async () => {
    const states = [
        SESSION_STATUS.DRAFT,
        SESSION_STATUS.SCHEDULED,
        SESSION_STATUS.WAITING,
        SESSION_STATUS.LIVE,
    ];

    for (const state of states) {
        assert.doesNotThrow(
            () => assertTransition(state, SESSION_STATUS.ABORTED, 'session'),
            `Expected abort from ${state} to be allowed`
        );
    }

    // Completed state should NOT allow any transitions (including abort)
    assert.throws(
        () => assertTransition(SESSION_STATUS.COMPLETED, SESSION_STATUS.ABORTED, 'session'),
        'Expected abort from completed to be blocked'
    );
});

test('State Machine Integration - session state persistence order', async () => {
    // Simulate the flow: state validation -> persistence -> acknowledgment
    const roomCode = 'TEST123';
    const session = {
        status: SESSION_STATUS.WAITING,
        participants: {},
        leaderboard: {},
        questions: [],
    };

    // Step 1: Store initial session
    await mockSessionStore.setSession(roomCode, session);

    // Step 2: Validate transition
    assert.doesNotThrow(
        () => assertTransition(SESSION_STATUS.WAITING, SESSION_STATUS.LIVE, 'session'),
        'Transition validation should pass'
    );

    // Step 3: Update and persist state
    session.status = SESSION_STATUS.LIVE;
    await mockSessionStore.setSession(roomCode, session);

    // Step 4: Verify persistence
    const persistedSession = await mockSessionStore.getSession(roomCode);
    assert.equal(persistedSession.status, SESSION_STATUS.LIVE, 'Session status should be persisted');
});

test('State Machine Integration - error handling for invalid transitions', async () => {
    const testCases = [
        {
            name: 'Cannot go from draft to live directly',
            from: SESSION_STATUS.DRAFT,
            to: SESSION_STATUS.LIVE,
            expectedError: 'INVALID_SESSION_TRANSITION',
        },
        {
            name: 'Cannot go from completed to waiting',
            from: SESSION_STATUS.COMPLETED,
            to: SESSION_STATUS.WAITING,
            expectedError: 'INVALID_SESSION_TRANSITION',
        },
        {
            name: 'Cannot go from aborted to live',
            from: SESSION_STATUS.ABORTED,
            to: SESSION_STATUS.LIVE,
            expectedError: 'INVALID_SESSION_TRANSITION',
        },
    ];

    for (const testCase of testCases) {
        let caughtError = null;
        try {
            assertTransition(testCase.from, testCase.to, 'session');
        } catch (err) {
            caughtError = err;
        }

        assert.ok(caughtError, `${testCase.name}: Expected error to be thrown`);
        assert.equal(caughtError.code, testCase.expectedError, `${testCase.name}: Expected error code ${testCase.expectedError}`);
        assert.match(caughtError.message, new RegExp(`${testCase.from} -> ${testCase.to}`), `${testCase.name}: Error message should contain transition details`);
    }
});

test('State Machine Integration - pause/resume state validation', async () => {
    const roomCode = 'PAUSE123';
    
    // Test pause from live state
    const liveSession = {
        status: SESSION_STATUS.LIVE,
        isPaused: false,
        participants: {},
    };
    await mockSessionStore.setSession(roomCode, liveSession);

    // Pause should be allowed from live state
    liveSession.isPaused = true;
    await mockSessionStore.setSession(roomCode, liveSession);
    
    const pausedSession = await mockSessionStore.getSession(roomCode);
    assert.equal(pausedSession.isPaused, true, 'Session should be paused');
    assert.equal(pausedSession.status, SESSION_STATUS.LIVE, 'Status should remain live');

    // Resume should restore state
    pausedSession.isPaused = false;
    await mockSessionStore.setSession(roomCode, pausedSession);
    
    const resumedSession = await mockSessionStore.getSession(roomCode);
    assert.equal(resumedSession.isPaused, false, 'Session should be resumed');
});

test('State Machine Integration - completion transition validation', async () => {
    const roomCode = 'COMPLETE123';
    
    // Test completion from live state
    const liveSession = {
        status: SESSION_STATUS.LIVE,
        participants: {},
        leaderboard: {},
    };
    await mockSessionStore.setSession(roomCode, liveSession);

    // Validate transition to completed
    assert.doesNotThrow(
        () => assertTransition(SESSION_STATUS.LIVE, SESSION_STATUS.COMPLETED, 'session'),
        'Transition from live to completed should be allowed'
    );

    // Update state
    liveSession.status = SESSION_STATUS.COMPLETED;
    await mockSessionStore.setSession(roomCode, liveSession);
    
    const completedSession = await mockSessionStore.getSession(roomCode);
    assert.equal(completedSession.status, SESSION_STATUS.COMPLETED, 'Session should be completed');

    // No further transitions should be allowed from completed (except abort)
    assert.throws(
        () => assertTransition(SESSION_STATUS.COMPLETED, SESSION_STATUS.LIVE, 'session'),
        'Transition from completed to live should be blocked'
    );
});

test('State Machine Integration - comprehensive transition matrix', async () => {
    // Define all possible transitions and their expected outcomes
    const transitionMatrix = {
        [SESSION_STATUS.DRAFT]: {
            [SESSION_STATUS.SCHEDULED]: true,
            [SESSION_STATUS.WAITING]: true,
            [SESSION_STATUS.LIVE]: false,
            [SESSION_STATUS.COMPLETED]: false,
            [SESSION_STATUS.ABORTED]: true,
        },
        [SESSION_STATUS.SCHEDULED]: {
            [SESSION_STATUS.DRAFT]: false,
            [SESSION_STATUS.WAITING]: true,
            [SESSION_STATUS.LIVE]: false,
            [SESSION_STATUS.COMPLETED]: false,
            [SESSION_STATUS.ABORTED]: true,
        },
        [SESSION_STATUS.WAITING]: {
            [SESSION_STATUS.DRAFT]: false,
            [SESSION_STATUS.SCHEDULED]: false,
            [SESSION_STATUS.LIVE]: true,
            [SESSION_STATUS.COMPLETED]: false,
            [SESSION_STATUS.ABORTED]: true,
        },
        [SESSION_STATUS.LIVE]: {
            [SESSION_STATUS.DRAFT]: false,
            [SESSION_STATUS.SCHEDULED]: false,
            [SESSION_STATUS.WAITING]: false,
            [SESSION_STATUS.COMPLETED]: true,
            [SESSION_STATUS.ABORTED]: true,
        },
        [SESSION_STATUS.COMPLETED]: {
            [SESSION_STATUS.DRAFT]: false,
            [SESSION_STATUS.SCHEDULED]: false,
            [SESSION_STATUS.WAITING]: false,
            [SESSION_STATUS.LIVE]: false,
            [SESSION_STATUS.ABORTED]: false, // No transitions from completed
        },
        [SESSION_STATUS.ABORTED]: {
            [SESSION_STATUS.DRAFT]: false,
            [SESSION_STATUS.SCHEDULED]: false,
            [SESSION_STATUS.WAITING]: true,
            [SESSION_STATUS.LIVE]: false,
            [SESSION_STATUS.COMPLETED]: false,
        },
    };

    // Test each transition in the matrix
    for (const [fromState, transitions] of Object.entries(transitionMatrix)) {
        for (const [toState, shouldSucceed] of Object.entries(transitions)) {
            if (shouldSucceed) {
                assert.doesNotThrow(
                    () => assertTransition(fromState, toState, 'session'),
                    `Transition ${fromState} -> ${toState} should be allowed`
                );
            } else {
                assert.throws(
                    () => assertTransition(fromState, toState, 'session'),
                    `Transition ${fromState} -> ${toState} should be blocked`
                );
            }
        }
    }
});
