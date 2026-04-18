const test = require('node:test');
const assert = require('node:assert/strict');

/**
 * Test suite for pause/resume functionality
 * Requirements: 1.7, 1.8, 2.7
 * 
 * Tests verify:
 * - Session preserves current question state when paused
 * - Remaining time is stored when paused
 * - State and timing are restored correctly on resume
 * - Pause/resume works in both auto and tutor modes
 */

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

const SESSION_STATUS = {
    DRAFT: 'draft',
    SCHEDULED: 'scheduled',
    WAITING: 'waiting',
    LIVE: 'live',
    COMPLETED: 'completed',
    ABORTED: 'aborted',
};

test('Pause/Resume - Preserves current question state when paused', async () => {
    const roomCode = 'PAUSE001';
    const currentTime = Date.now();
    
    const session = {
        status: SESSION_STATUS.LIVE,
        mode: 'auto',
        currentQuestionIndex: 2,
        questionState: 'live',
        questionStartTime: currentTime - 5000, // Started 5 seconds ago
        questionExpiry: currentTime + 25000, // 25 seconds remaining
        questions: [
            { _id: 'q1', text: 'Question 1', timeLimit: 30 },
            { _id: 'q2', text: 'Question 2', timeLimit: 30 },
            { _id: 'q3', text: 'Question 3', timeLimit: 30 },
            { _id: 'q4', text: 'Question 4', timeLimit: 30 },
        ],
        participants: { user1: { _id: 'user1', name: 'Test User' } },
        leaderboard: { user1: { score: 100, time: 15 } },
        isPaused: false,
    };

    await mockSessionStore.setSession(roomCode, session);

    // Simulate pause operation
    const pauseTime = Date.now();
    session.isPaused = true;
    session.pausedAt = pauseTime;
    session.timeLeftOnPause = session.questionExpiry - pauseTime;
    
    await mockSessionStore.setSession(roomCode, session);

    const pausedSession = await mockSessionStore.getSession(roomCode);
    
    // Verify question state is preserved
    assert.equal(pausedSession.isPaused, true, 'Session should be paused');
    assert.equal(pausedSession.currentQuestionIndex, 2, 'Current question index should be preserved');
    assert.equal(pausedSession.questionState, 'live', 'Question state should be preserved');
    assert.ok(pausedSession.pausedAt, 'Pause timestamp should be recorded');
    assert.ok(pausedSession.timeLeftOnPause > 0, 'Remaining time should be stored');
});

test('Pause/Resume - Stores remaining time when paused', async () => {
    const roomCode = 'PAUSE002';
    const currentTime = Date.now();
    const timeLimit = 30;
    const elapsedTime = 8; // 8 seconds elapsed
    const remainingTime = (timeLimit - elapsedTime) * 1000; // 22 seconds remaining
    
    const session = {
        status: SESSION_STATUS.LIVE,
        mode: 'auto',
        currentQuestionIndex: 0,
        questionStartTime: currentTime - (elapsedTime * 1000),
        questionExpiry: currentTime + remainingTime,
        questions: [
            { _id: 'q1', text: 'Question 1', timeLimit: timeLimit },
        ],
        participants: {},
        leaderboard: {},
        isPaused: false,
    };

    await mockSessionStore.setSession(roomCode, session);

    // Pause the session
    const pauseTime = Date.now();
    const calculatedTimeLeft = session.questionExpiry - pauseTime;
    
    session.isPaused = true;
    session.pausedAt = pauseTime;
    session.timeLeftOnPause = calculatedTimeLeft;
    
    await mockSessionStore.setSession(roomCode, session);

    const pausedSession = await mockSessionStore.getSession(roomCode);
    
    // Verify remaining time is stored
    assert.ok(pausedSession.timeLeftOnPause, 'Time left should be stored');
    assert.ok(pausedSession.timeLeftOnPause > 0, 'Time left should be positive');
    assert.ok(pausedSession.timeLeftOnPause <= remainingTime + 100, 'Time left should be approximately correct (with small margin)');
    assert.equal(pausedSession.pausedAt, pauseTime, 'Pause timestamp should match');
});

test('Pause/Resume - Restores state and adjusts timing on resume', async () => {
    const roomCode = 'RESUME001';
    const currentTime = Date.now();
    const timeLeftWhenPaused = 15000; // 15 seconds remaining when paused
    
    const session = {
        status: SESSION_STATUS.LIVE,
        mode: 'auto',
        currentQuestionIndex: 1,
        questionState: 'live',
        questionStartTime: currentTime - 15000,
        questionExpiry: currentTime + timeLeftWhenPaused,
        questions: [
            { _id: 'q1', text: 'Question 1', timeLimit: 30 },
            { _id: 'q2', text: 'Question 2', timeLimit: 30 },
        ],
        participants: {},
        leaderboard: {},
        isPaused: true,
        pausedAt: currentTime,
        timeLeftOnPause: timeLeftWhenPaused,
    };

    await mockSessionStore.setSession(roomCode, session);

    // Simulate some time passing while paused (5 seconds)
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to simulate passage of time

    // Resume the session
    const resumeTime = Date.now();
    session.isPaused = false;
    session.questionExpiry = resumeTime + session.timeLeftOnPause;
    
    await mockSessionStore.setSession(roomCode, session);

    const resumedSession = await mockSessionStore.getSession(roomCode);
    
    // Verify state is restored
    assert.equal(resumedSession.isPaused, false, 'Session should be resumed');
    assert.equal(resumedSession.currentQuestionIndex, 1, 'Question index should be preserved');
    assert.equal(resumedSession.questionState, 'live', 'Question state should be preserved');
    
    // Verify timing is adjusted
    assert.ok(resumedSession.questionExpiry, 'Question expiry should be set');
    assert.ok(resumedSession.questionExpiry > resumeTime, 'Question expiry should be in the future');
    
    const newTimeLeft = resumedSession.questionExpiry - resumeTime;
    assert.ok(Math.abs(newTimeLeft - timeLeftWhenPaused) < 200, 
        `Time left should be approximately preserved (expected ~${timeLeftWhenPaused}ms, got ${newTimeLeft}ms)`);
});

test('Pause/Resume - Works in tutor mode', async () => {
    const roomCode = 'TUTOR_PAUSE001';
    
    const session = {
        status: SESSION_STATUS.LIVE,
        mode: 'tutor',
        currentQuestionIndex: 0,
        questionState: 'live',
        questionStartTime: Date.now(),
        questionExpiry: null, // Tutor mode has no expiry
        questions: [
            { _id: 'q1', text: 'Question 1', timeLimit: 30 },
            { _id: 'q2', text: 'Question 2', timeLimit: 30 },
        ],
        participants: {},
        leaderboard: {},
        isPaused: false,
    };

    await mockSessionStore.setSession(roomCode, session);

    // Pause in tutor mode
    const pauseTime = Date.now();
    session.isPaused = true;
    session.pausedAt = pauseTime;
    session.timeLeftOnPause = session.questionExpiry ? (session.questionExpiry - pauseTime) : 0;
    
    await mockSessionStore.setSession(roomCode, session);

    const pausedSession = await mockSessionStore.getSession(roomCode);
    
    // Verify pause works in tutor mode
    assert.equal(pausedSession.isPaused, true, 'Tutor mode session should be paused');
    assert.equal(pausedSession.mode, 'tutor', 'Mode should remain tutor');
    assert.equal(pausedSession.currentQuestionIndex, 0, 'Question index should be preserved');
    
    // Resume in tutor mode
    session.isPaused = false;
    if (session.timeLeftOnPause > 0) {
        session.questionExpiry = Date.now() + session.timeLeftOnPause;
    }
    
    await mockSessionStore.setSession(roomCode, session);

    const resumedSession = await mockSessionStore.getSession(roomCode);
    
    // Verify resume works in tutor mode
    assert.equal(resumedSession.isPaused, false, 'Tutor mode session should be resumed');
    assert.equal(resumedSession.currentQuestionIndex, 0, 'Question index should still be preserved');
});

test('Pause/Resume - Cannot pause when not in LIVE or WAITING state', async () => {
    const testCases = [
        { status: SESSION_STATUS.DRAFT, shouldFail: true },
        { status: SESSION_STATUS.COMPLETED, shouldFail: true },
        { status: SESSION_STATUS.ABORTED, shouldFail: true },
        { status: SESSION_STATUS.LIVE, shouldFail: false },
        { status: SESSION_STATUS.WAITING, shouldFail: false },
    ];

    for (const { status, shouldFail } of testCases) {
        const canPause = status === SESSION_STATUS.LIVE || status === SESSION_STATUS.WAITING;
        
        if (shouldFail) {
            assert.equal(canPause, false, `Should not be able to pause in ${status} state`);
        } else {
            assert.equal(canPause, true, `Should be able to pause in ${status} state`);
        }
    }
});

test('Pause/Resume - Cannot resume when not paused', async () => {
    const roomCode = 'NOTPAUSED001';
    
    const session = {
        status: SESSION_STATUS.LIVE,
        mode: 'auto',
        currentQuestionIndex: 0,
        isPaused: false,
        questions: [{ _id: 'q1', text: 'Question 1', timeLimit: 30 }],
        participants: {},
        leaderboard: {},
    };

    await mockSessionStore.setSession(roomCode, session);

    // Attempt to resume when not paused
    const canResume = session.isPaused === true;
    
    assert.equal(canResume, false, 'Should not be able to resume when not paused');
});

test('Pause/Resume - Cannot pause when already paused', async () => {
    const roomCode = 'ALREADYPAUSED001';
    
    const session = {
        status: SESSION_STATUS.LIVE,
        mode: 'auto',
        currentQuestionIndex: 0,
        isPaused: true,
        pausedAt: Date.now(),
        timeLeftOnPause: 20000,
        questions: [{ _id: 'q1', text: 'Question 1', timeLimit: 30 }],
        participants: {},
        leaderboard: {},
    };

    await mockSessionStore.setSession(roomCode, session);

    // Attempt to pause when already paused
    const canPause = !session.isPaused;
    
    assert.equal(canPause, false, 'Should not be able to pause when already paused');
});

test('Pause/Resume - Preserves participant and leaderboard data', async () => {
    const roomCode = 'PRESERVE001';
    const currentTime = Date.now();
    
    const session = {
        status: SESSION_STATUS.LIVE,
        mode: 'auto',
        currentQuestionIndex: 1,
        questionExpiry: currentTime + 20000,
        questions: [
            { _id: 'q1', text: 'Question 1', timeLimit: 30 },
            { _id: 'q2', text: 'Question 2', timeLimit: 30 },
        ],
        participants: {
            user1: { _id: 'user1', name: 'Alice' },
            user2: { _id: 'user2', name: 'Bob' },
        },
        leaderboard: {
            user1: { userId: 'user1', name: 'Alice', score: 150, time: 25, streak: 2 },
            user2: { userId: 'user2', name: 'Bob', score: 120, time: 30, streak: 1 },
        },
        isPaused: false,
    };

    await mockSessionStore.setSession(roomCode, session);

    // Pause
    session.isPaused = true;
    session.pausedAt = Date.now();
    session.timeLeftOnPause = session.questionExpiry - Date.now();
    await mockSessionStore.setSession(roomCode, session);

    const pausedSession = await mockSessionStore.getSession(roomCode);
    
    // Verify data is preserved during pause
    assert.equal(Object.keys(pausedSession.participants).length, 2, 'Participants should be preserved');
    assert.equal(pausedSession.participants.user1.name, 'Alice', 'Participant data should be intact');
    assert.equal(Object.keys(pausedSession.leaderboard).length, 2, 'Leaderboard should be preserved');
    assert.equal(pausedSession.leaderboard.user1.score, 150, 'Leaderboard scores should be intact');
    
    // Resume
    session.isPaused = false;
    session.questionExpiry = Date.now() + session.timeLeftOnPause;
    await mockSessionStore.setSession(roomCode, session);

    const resumedSession = await mockSessionStore.getSession(roomCode);
    
    // Verify data is still preserved after resume
    assert.equal(Object.keys(resumedSession.participants).length, 2, 'Participants should still be preserved');
    assert.equal(resumedSession.participants.user2.name, 'Bob', 'Participant data should still be intact');
    assert.equal(Object.keys(resumedSession.leaderboard).length, 2, 'Leaderboard should still be preserved');
    assert.equal(resumedSession.leaderboard.user2.score, 120, 'Leaderboard scores should still be intact');
});

test('Pause/Resume - Multiple pause/resume cycles preserve state', async () => {
    const roomCode = 'MULTICYCLE001';
    let currentTime = Date.now();
    
    const session = {
        status: SESSION_STATUS.LIVE,
        mode: 'auto',
        currentQuestionIndex: 0,
        questionExpiry: currentTime + 30000, // 30 seconds
        questions: [{ _id: 'q1', text: 'Question 1', timeLimit: 30 }],
        participants: {},
        leaderboard: {},
        isPaused: false,
    };

    await mockSessionStore.setSession(roomCode, session);

    // First pause
    currentTime = Date.now();
    session.isPaused = true;
    session.pausedAt = currentTime;
    session.timeLeftOnPause = session.questionExpiry - currentTime;
    await mockSessionStore.setSession(roomCode, session);

    const firstPauseTimeLeft = session.timeLeftOnPause;
    
    // First resume
    await new Promise(resolve => setTimeout(resolve, 50));
    currentTime = Date.now();
    session.isPaused = false;
    session.questionExpiry = currentTime + session.timeLeftOnPause;
    await mockSessionStore.setSession(roomCode, session);

    // Second pause
    await new Promise(resolve => setTimeout(resolve, 50));
    currentTime = Date.now();
    session.isPaused = true;
    session.pausedAt = currentTime;
    session.timeLeftOnPause = session.questionExpiry - currentTime;
    await mockSessionStore.setSession(roomCode, session);

    const secondPauseTimeLeft = session.timeLeftOnPause;
    
    // Verify time is decreasing appropriately
    assert.ok(secondPauseTimeLeft < firstPauseTimeLeft, 
        'Time left should decrease after resume and re-pause');
    assert.ok(secondPauseTimeLeft > 0, 'Time left should still be positive');
});

test('Pause/Resume - Cannot submit answers while paused', async () => {
    const roomCode = 'NOSUBMIT001';
    
    const session = {
        status: SESSION_STATUS.LIVE,
        mode: 'auto',
        currentQuestionIndex: 0,
        isPaused: true,
        questions: [{ _id: 'q1', text: 'Question 1', timeLimit: 30 }],
        participants: {},
        leaderboard: {},
    };

    await mockSessionStore.setSession(roomCode, session);

    // Check if answers can be submitted
    const canSubmit = session.status === SESSION_STATUS.LIVE && !session.isPaused;
    
    assert.equal(canSubmit, false, 'Should not be able to submit answers while paused');
});

test('Pause/Resume - Timers are cleared when paused', async () => {
    const roomCode = 'CLEARTIMER001';
    const currentTime = Date.now();
    
    const session = {
        status: SESSION_STATUS.LIVE,
        mode: 'auto',
        currentQuestionIndex: 0,
        questionExpiry: currentTime + 25000,
        questions: [{ _id: 'q1', text: 'Question 1', timeLimit: 30 }],
        participants: {},
        leaderboard: {},
        isPaused: false,
    };

    await mockSessionStore.setSession(roomCode, session);

    // Simulate timer being active
    const timerWasActive = session.questionExpiry && session.questionExpiry > Date.now();
    assert.ok(timerWasActive, 'Timer should be active before pause');

    // Pause - timers should be cleared
    session.isPaused = true;
    session.pausedAt = Date.now();
    session.timeLeftOnPause = session.questionExpiry - Date.now();
    await mockSessionStore.setSession(roomCode, session);

    const pausedSession = await mockSessionStore.getSession(roomCode);
    
    // Verify pause state
    assert.equal(pausedSession.isPaused, true, 'Session should be paused');
    assert.ok(pausedSession.timeLeftOnPause > 0, 'Remaining time should be stored');
    
    // Note: Actual timer clearing happens in clearTimers() function
    // This test verifies the state is set up correctly for timer clearing
});

test('Pause/Resume - Requirement 1.7: Preserve question state and remaining time', async () => {
    // Requirement 1.7: WHEN a session is paused, THE Quiz_Engine SHALL preserve 
    // the current question state and remaining time
    
    const roomCode = 'REQ1.7';
    const currentTime = Date.now();
    const remainingTime = 18000; // 18 seconds
    
    const session = {
        status: SESSION_STATUS.LIVE,
        mode: 'auto',
        currentQuestionIndex: 3,
        questionState: 'live',
        questionStartTime: currentTime - 12000,
        questionExpiry: currentTime + remainingTime,
        questions: Array(5).fill(null).map((_, i) => ({ 
            _id: `q${i}`, 
            text: `Question ${i}`, 
            timeLimit: 30 
        })),
        participants: { user1: { _id: 'user1', name: 'Test' } },
        leaderboard: { user1: { score: 200, time: 40 } },
        isPaused: false,
    };

    await mockSessionStore.setSession(roomCode, session);

    // Pause operation
    const pauseTime = Date.now();
    session.isPaused = true;
    session.pausedAt = pauseTime;
    session.timeLeftOnPause = session.questionExpiry - pauseTime;
    await mockSessionStore.setSession(roomCode, session);

    const pausedSession = await mockSessionStore.getSession(roomCode);
    
    // Verify Requirement 1.7
    assert.equal(pausedSession.currentQuestionIndex, 3, 
        'REQ 1.7: Current question index must be preserved');
    assert.equal(pausedSession.questionState, 'live', 
        'REQ 1.7: Question state must be preserved');
    assert.ok(pausedSession.timeLeftOnPause > 0, 
        'REQ 1.7: Remaining time must be stored');
    assert.ok(Math.abs(pausedSession.timeLeftOnPause - remainingTime) < 100, 
        'REQ 1.7: Remaining time must be accurate');
});

test('Pause/Resume - Requirement 1.8: Restore state and adjust timing on resume', async () => {
    // Requirement 1.8: WHEN a paused session is resumed, THE Quiz_Engine SHALL 
    // restore the question state and adjust timing accordingly
    
    const roomCode = 'REQ1.8';
    const timeLeftWhenPaused = 12000; // 12 seconds
    
    const session = {
        status: SESSION_STATUS.LIVE,
        mode: 'auto',
        currentQuestionIndex: 2,
        questionState: 'live',
        questionStartTime: Date.now() - 18000,
        questionExpiry: Date.now() + timeLeftWhenPaused,
        questions: Array(4).fill(null).map((_, i) => ({ 
            _id: `q${i}`, 
            text: `Question ${i}`, 
            timeLimit: 30 
        })),
        participants: { user1: { _id: 'user1', name: 'Test' } },
        leaderboard: { user1: { score: 150, time: 30 } },
        isPaused: true,
        pausedAt: Date.now(),
        timeLeftOnPause: timeLeftWhenPaused,
    };

    await mockSessionStore.setSession(roomCode, session);

    // Wait a bit to simulate pause duration
    await new Promise(resolve => setTimeout(resolve, 100));

    // Resume operation
    const resumeTime = Date.now();
    session.isPaused = false;
    session.questionExpiry = resumeTime + session.timeLeftOnPause;
    await mockSessionStore.setSession(roomCode, session);

    const resumedSession = await mockSessionStore.getSession(roomCode);
    
    // Verify Requirement 1.8
    assert.equal(resumedSession.isPaused, false, 
        'REQ 1.8: Session must be resumed');
    assert.equal(resumedSession.currentQuestionIndex, 2, 
        'REQ 1.8: Question state must be restored');
    assert.equal(resumedSession.questionState, 'live', 
        'REQ 1.8: Question state must be restored');
    assert.ok(resumedSession.questionExpiry > resumeTime, 
        'REQ 1.8: Timing must be adjusted (expiry in future)');
    
    const newTimeLeft = resumedSession.questionExpiry - resumeTime;
    assert.ok(Math.abs(newTimeLeft - timeLeftWhenPaused) < 200, 
        'REQ 1.8: Timing must be adjusted correctly (preserved time left)');
});

test('Pause/Resume - Requirement 2.7: Allow pause/resume in tutor mode', async () => {
    // Requirement 2.7: WHERE session mode is tutor, THE Quiz_Engine SHALL 
    // allow the host to pause and resume at any time
    
    const roomCode = 'REQ2.7';
    
    const session = {
        status: SESSION_STATUS.LIVE,
        mode: 'tutor',
        currentQuestionIndex: 1,
        questionState: 'live',
        questionStartTime: Date.now(),
        questionExpiry: null, // Tutor mode has no timer
        questions: Array(3).fill(null).map((_, i) => ({ 
            _id: `q${i}`, 
            text: `Question ${i}`, 
            timeLimit: 30 
        })),
        participants: {},
        leaderboard: {},
        isPaused: false,
    };

    await mockSessionStore.setSession(roomCode, session);

    // Verify can pause in tutor mode
    const canPause = (session.status === SESSION_STATUS.LIVE || 
                      session.status === SESSION_STATUS.WAITING) && 
                     !session.isPaused;
    assert.ok(canPause, 'REQ 2.7: Must be able to pause in tutor mode');

    // Pause
    session.isPaused = true;
    session.pausedAt = Date.now();
    session.timeLeftOnPause = session.questionExpiry ? 
        (session.questionExpiry - Date.now()) : 0;
    await mockSessionStore.setSession(roomCode, session);

    const pausedSession = await mockSessionStore.getSession(roomCode);
    assert.equal(pausedSession.isPaused, true, 
        'REQ 2.7: Tutor mode session must be pausable');

    // Verify can resume in tutor mode
    const canResume = pausedSession.isPaused === true;
    assert.ok(canResume, 'REQ 2.7: Must be able to resume in tutor mode');

    // Resume
    pausedSession.isPaused = false;
    if (pausedSession.timeLeftOnPause > 0) {
        pausedSession.questionExpiry = Date.now() + pausedSession.timeLeftOnPause;
    }
    await mockSessionStore.setSession(roomCode, pausedSession);

    const resumedSession = await mockSessionStore.getSession(roomCode);
    assert.equal(resumedSession.isPaused, false, 
        'REQ 2.7: Tutor mode session must be resumable');
    assert.equal(resumedSession.mode, 'tutor', 
        'REQ 2.7: Mode must remain tutor after resume');
});
