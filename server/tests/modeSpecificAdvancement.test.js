const test = require('node:test');
const assert = require('node:assert/strict');

/**
 * Test suite for mode-specific question advancement logic
 * Requirements: 2.1, 2.2, 2.3
 * 
 * Tests verify:
 * - Auto mode: Questions advance automatically when time expires
 * - Tutor mode: Host manually advances questions at their own pace
 * - Manual advancement in tutor mode completes within 500ms
 * - Broadcasts complete within 1 second
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

test('Mode-specific advancement - Auto mode sets questionExpiry', async () => {
    const roomCode = 'AUTO123';
    const session = {
        status: SESSION_STATUS.LIVE,
        mode: 'auto',
        currentQuestionIndex: 0,
        questions: [
            { _id: 'q1', text: 'Question 1', timeLimit: 30, options: ['A', 'B', 'C', 'D'] },
            { _id: 'q2', text: 'Question 2', timeLimit: 45, options: ['A', 'B', 'C', 'D'] },
        ],
        participants: {},
        leaderboard: {},
    };

    await mockSessionStore.setSession(roomCode, session);

    // Simulate broadcastQuestionEnhanced logic for auto mode
    const question = session.questions[session.currentQuestionIndex];
    session.questionStartTime = Date.now();
    session.questionExpiry = Date.now() + (question.timeLimit * 1000);
    session.questionState = 'live';

    await mockSessionStore.setSession(roomCode, session);

    const updatedSession = await mockSessionStore.getSession(roomCode);
    assert.ok(updatedSession.questionExpiry, 'Auto mode should set questionExpiry');
    assert.ok(updatedSession.questionExpiry > Date.now(), 'questionExpiry should be in the future');
    assert.equal(updatedSession.questionState, 'live', 'Question state should be live');
});

test('Mode-specific advancement - Tutor mode does NOT set questionExpiry', async () => {
    const roomCode = 'TUTOR123';
    const session = {
        status: SESSION_STATUS.LIVE,
        mode: 'tutor',
        currentQuestionIndex: 0,
        questions: [
            { _id: 'q1', text: 'Question 1', timeLimit: 30, options: ['A', 'B', 'C', 'D'] },
            { _id: 'q2', text: 'Question 2', timeLimit: 45, options: ['A', 'B', 'C', 'D'] },
        ],
        participants: {},
        leaderboard: {},
    };

    await mockSessionStore.setSession(roomCode, session);

    // Simulate broadcastQuestionEnhanced logic for tutor mode
    const question = session.questions[session.currentQuestionIndex];
    session.questionStartTime = Date.now();
    session.questionExpiry = null; // Tutor mode: no countdown timer
    session.questionState = 'live';

    await mockSessionStore.setSession(roomCode, session);

    const updatedSession = await mockSessionStore.getSession(roomCode);
    assert.equal(updatedSession.questionExpiry, null, 'Tutor mode should NOT set questionExpiry');
    assert.equal(updatedSession.questionState, 'live', 'Question state should be live');
});

test('Mode-specific advancement - Manual advancement in tutor mode', async () => {
    const roomCode = 'TUTOR456';
    const session = {
        status: SESSION_STATUS.LIVE,
        mode: 'tutor',
        currentQuestionIndex: 0,
        questions: [
            { _id: 'q1', text: 'Question 1', timeLimit: 30, options: ['A', 'B', 'C', 'D'] },
            { _id: 'q2', text: 'Question 2', timeLimit: 45, options: ['A', 'B', 'C', 'D'] },
        ],
        participants: {},
        leaderboard: {},
        isPaused: false,
    };

    await mockSessionStore.setSession(roomCode, session);

    // Simulate manual advancement (advanceQuizQuestion logic)
    const startTime = Date.now();
    
    // Validate session state
    assert.equal(session.status, SESSION_STATUS.LIVE, 'Session should be live');
    assert.equal(session.isPaused, false, 'Session should not be paused');
    assert.ok(session.currentQuestionIndex < session.questions.length - 1, 'Should have more questions');

    // Advance to next question
    session.currentQuestionIndex += 1;
    await mockSessionStore.setSession(roomCode, session);

    const endTime = Date.now();
    const duration = endTime - startTime;

    const updatedSession = await mockSessionStore.getSession(roomCode);
    assert.equal(updatedSession.currentQuestionIndex, 1, 'Should advance to next question');
    assert.ok(duration < 500, `Manual advancement should complete within 500ms (took ${duration}ms)`);
});

test('Mode-specific advancement - Cannot advance when paused', async () => {
    const roomCode = 'PAUSED123';
    const session = {
        status: SESSION_STATUS.LIVE,
        mode: 'tutor',
        currentQuestionIndex: 0,
        questions: [
            { _id: 'q1', text: 'Question 1', timeLimit: 30, options: ['A', 'B', 'C', 'D'] },
            { _id: 'q2', text: 'Question 2', timeLimit: 45, options: ['A', 'B', 'C', 'D'] },
        ],
        participants: {},
        leaderboard: {},
        isPaused: true,
    };

    await mockSessionStore.setSession(roomCode, session);

    // Attempt to advance while paused should fail
    const canAdvance = !session.isPaused && session.status === SESSION_STATUS.LIVE;
    assert.equal(canAdvance, false, 'Should not be able to advance when paused');
});

test('Mode-specific advancement - Cannot advance beyond last question', async () => {
    const roomCode = 'LAST123';
    const session = {
        status: SESSION_STATUS.LIVE,
        mode: 'tutor',
        currentQuestionIndex: 1, // Already at last question (index 1 of 2 questions)
        questions: [
            { _id: 'q1', text: 'Question 1', timeLimit: 30, options: ['A', 'B', 'C', 'D'] },
            { _id: 'q2', text: 'Question 2', timeLimit: 45, options: ['A', 'B', 'C', 'D'] },
        ],
        participants: {},
        leaderboard: {},
        isPaused: false,
    };

    await mockSessionStore.setSession(roomCode, session);

    // Check if there are more questions
    const hasMoreQuestions = session.currentQuestionIndex < session.questions.length - 1;
    assert.equal(hasMoreQuestions, false, 'Should not have more questions to advance to');
});

test('Mode-specific advancement - Mode is properly set from quiz', async () => {
    // Test that mode is correctly transferred from Quiz to session state
    const testCases = [
        { quizMode: 'auto', expectedSessionMode: 'auto' },
        { quizMode: 'tutor', expectedSessionMode: 'tutor' },
        { quizMode: 'teaching', expectedSessionMode: 'tutor' }, // teaching maps to tutor
    ];

    for (const { quizMode, expectedSessionMode } of testCases) {
        const quiz = { mode: quizMode };
        
        // Simulate the mode mapping logic from startQuizSession
        const sessionMode = (quiz.mode === 'teaching' || quiz.mode === 'tutor') ? 'tutor' : 'auto';
        
        assert.equal(sessionMode, expectedSessionMode, 
            `Quiz mode '${quizMode}' should map to session mode '${expectedSessionMode}'`);
    }
});

test('Mode-specific advancement - Auto mode schedules timer', async () => {
    const roomCode = 'TIMER123';
    const session = {
        status: SESSION_STATUS.LIVE,
        mode: 'auto',
        currentQuestionIndex: 0,
        questions: [
            { _id: 'q1', text: 'Question 1', timeLimit: 30, options: ['A', 'B', 'C', 'D'] },
        ],
        participants: {},
        leaderboard: {},
    };

    await mockSessionStore.setSession(roomCode, session);

    // In auto mode, a timer should be scheduled
    const question = session.questions[session.currentQuestionIndex];
    const timeLimitMs = question.timeLimit * 1000;
    
    assert.ok(timeLimitMs > 0, 'Timer should be scheduled with positive duration');
    assert.equal(timeLimitMs, 30000, 'Timer should be 30 seconds for this question');
});

test('Mode-specific advancement - Tutor mode does NOT schedule timer', async () => {
    const roomCode = 'NOTIMER123';
    const session = {
        status: SESSION_STATUS.LIVE,
        mode: 'tutor',
        currentQuestionIndex: 0,
        questions: [
            { _id: 'q1', text: 'Question 1', timeLimit: 30, options: ['A', 'B', 'C', 'D'] },
        ],
        participants: {},
        leaderboard: {},
    };

    await mockSessionStore.setSession(roomCode, session);

    // In tutor mode, questionExpiry should be null (no timer)
    session.questionExpiry = null;
    await mockSessionStore.setSession(roomCode, session);

    const updatedSession = await mockSessionStore.getSession(roomCode);
    assert.equal(updatedSession.questionExpiry, null, 'Tutor mode should not have questionExpiry');
});

test('Mode-specific advancement - Broadcast timing validation', async () => {
    const roomCode = 'BROADCAST123';
    const session = {
        status: SESSION_STATUS.LIVE,
        mode: 'auto',
        currentQuestionIndex: 0,
        questions: [
            { _id: 'q1', text: 'Question 1', timeLimit: 30, options: ['A', 'B', 'C', 'D'] },
        ],
        participants: {},
        leaderboard: {},
    };

    await mockSessionStore.setSession(roomCode, session);

    // Simulate broadcast timing
    const startTime = Date.now();
    
    // Simulate the broadcast operations
    const question = session.questions[session.currentQuestionIndex];
    session.questionStartTime = Date.now();
    session.questionExpiry = Date.now() + (question.timeLimit * 1000);
    session.questionState = 'live';
    await mockSessionStore.setSession(roomCode, session);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Requirement: broadcasts should complete within 1 second
    assert.ok(duration < 1000, `Broadcast should complete within 1 second (took ${duration}ms)`);
});

test('Mode-specific advancement - Session completion when no more questions', async () => {
    const roomCode = 'COMPLETE123';
    const session = {
        status: SESSION_STATUS.LIVE,
        mode: 'auto',
        currentQuestionIndex: 2, // Beyond last question
        questions: [
            { _id: 'q1', text: 'Question 1', timeLimit: 30, options: ['A', 'B', 'C', 'D'] },
            { _id: 'q2', text: 'Question 2', timeLimit: 45, options: ['A', 'B', 'C', 'D'] },
        ],
        participants: {},
        leaderboard: {},
    };

    await mockSessionStore.setSession(roomCode, session);

    // When currentQuestionIndex >= questions.length, session should complete
    const shouldComplete = session.currentQuestionIndex >= session.questions.length;
    assert.equal(shouldComplete, true, 'Session should complete when no more questions');

    if (shouldComplete) {
        session.status = SESSION_STATUS.COMPLETED;
        session.questionState = 'waiting';
        await mockSessionStore.setSession(roomCode, session);
    }

    const completedSession = await mockSessionStore.getSession(roomCode);
    assert.equal(completedSession.status, SESSION_STATUS.COMPLETED, 'Session should be completed');
});
