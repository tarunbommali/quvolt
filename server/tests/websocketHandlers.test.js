/**
 * websocketHandlers.test.js
 *
 * Tests for Task 2.3: Update WebSocket handlers for mode controls
 * 
 * Requirements tested:
 * - 2.4: WHEN a host triggers next-question in tutor mode, THE Quiz_Engine SHALL transition to the next question within 500ms
 * - 2.5: THE Quiz_Engine SHALL broadcast question state changes to all connected participants within 1 second
 * 
 * Verifies:
 * - host:next-question event handler exists and works
 * - host:pause event handler exists and works
 * - host:resume event handler exists and works
 * - Broadcasts complete within 1 second
 * - State changes are propagated to all participants
 */

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const quizService = require('../services/quiz/quiz.service');
const sessionStore = require('../services/session/session.service');

// Mock the Quiz and QuizSession models
const Quiz = require('../models/Quiz');
const QuizSession = require('../models/QuizSession');

// Store original methods
const originalQuizFindById = Quiz.findById;
const originalQuizSessionFindOne = QuizSession.findOne;
const originalQuizSessionFindOneAndUpdate = QuizSession.findOneAndUpdate;
const originalQuizFindByIdAndUpdate = Quiz.findByIdAndUpdate;

describe('WebSocket Handlers for Mode Controls (Task 2.3)', () => {
    const TEST_SESSION_CODE = 'TEST123';
    const TEST_QUIZ_ID = 'test-quiz-id-123';
    const TEST_HOST_USER = { _id: 'host1', role: 'host' };
    const TEST_PARTICIPANT_USER = { _id: 'participant1', role: 'participant' };

    // Mock IO object
    let mockIo;
    let emittedEvents;

    before(() => {
        // Mock Quiz.findById
        Quiz.findById = function() {
            return {
                lean: () => Promise.resolve({
                    _id: TEST_QUIZ_ID,
                    hostId: 'host1',
                    title: 'Test Quiz',
                    status: 'live',
                    lastSessionCode: TEST_SESSION_CODE
                })
            };
        };

        // Mock Quiz.findByIdAndUpdate
        Quiz.findByIdAndUpdate = function() {
            return Promise.resolve({});
        };

        // Mock QuizSession.findOne
        QuizSession.findOne = function() {
            return {
                lean: () => Promise.resolve({
                    sessionCode: TEST_SESSION_CODE,
                    quizId: TEST_QUIZ_ID,
                    status: 'live'
                }),
                sort: () => ({
                    lean: () => Promise.resolve({
                        sessionCode: TEST_SESSION_CODE,
                        quizId: TEST_QUIZ_ID,
                        status: 'live'
                    })
                })
            };
        };

        // Mock QuizSession.findOneAndUpdate
        QuizSession.findOneAndUpdate = function() {
            return Promise.resolve({});
        };
    });

    after(() => {
        // Restore original methods
        Quiz.findById = originalQuizFindById;
        Quiz.findByIdAndUpdate = originalQuizFindByIdAndUpdate;
        QuizSession.findOne = originalQuizSessionFindOne;
        QuizSession.findOneAndUpdate = originalQuizSessionFindOneAndUpdate;
    });

    beforeEach(async () => {
        // Reset emitted events tracker
        emittedEvents = [];

        // Create mock IO object
        mockIo = {
            to: (roomCode) => ({
                emit: (event, data) => {
                    emittedEvents.push({ roomCode, event, data });
                }
            })
        };

        // Setup test session with quizId
        const testSession = {
            sessionCode: TEST_SESSION_CODE,
            quizId: TEST_QUIZ_ID,
            status: 'live',
            mode: 'tutor',
            currentQuestionIndex: 0,
            isPaused: false,
            questions: [
                { _id: 'q1', question: 'Question 1', timeLimit: 30, options: ['A', 'B', 'C', 'D'], correctAnswer: 0 },
                { _id: 'q2', question: 'Question 2', timeLimit: 30, options: ['A', 'B', 'C', 'D'], correctAnswer: 1 },
                { _id: 'q3', question: 'Question 3', timeLimit: 30, options: ['A', 'B', 'C', 'D'], correctAnswer: 2 }
            ],
            participants: {},
            leaderboard: {},
            currentQuestionStats: {
                totalSubmissions: 0,
                correctSubmissions: 0,
                optionCounts: { 0: 0, 1: 0, 2: 0, 3: 0 }
            }
        };
        await sessionStore.setSession(TEST_SESSION_CODE, testSession);
    });

    afterEach(async () => {
        // Clean up session
        await sessionStore.deleteSession(TEST_SESSION_CODE);
    });

    it('should have host:next-question handler and advance question', async () => {
        const startTime = Date.now();

        // Call the service method directly (this is what the socket handler calls)
        const result = await quizService.advanceQuizQuestion({
            io: mockIo,
            quizId: TEST_QUIZ_ID,
            sessionCode: TEST_SESSION_CODE,
            user: TEST_HOST_USER
        });

        const elapsed = Date.now() - startTime;

        // Verify no error
        assert.ok(!result.error, `Should not return error: ${result.error || 'none'}`);

        // Verify response time is within 500ms (Requirement 2.4)
        assert.ok(elapsed < 500, `Response time ${elapsed}ms should be < 500ms`);

        // Verify session was updated
        const session = await sessionStore.getSession(TEST_SESSION_CODE);
        assert.strictEqual(session.currentQuestionIndex, 1, 'Should advance to next question');

        // Verify broadcasts were sent (Requirement 2.5)
        const questionEvents = emittedEvents.filter(e => 
            e.event === 'new_question' || e.event === 'question:update'
        );
        assert.ok(questionEvents.length > 0, 'Should broadcast question update events');
    });

    it('should have host:pause handler and pause session', async () => {
        // Call the service method directly
        const result = await quizService.pauseQuizSession({
            io: mockIo,
            quizId: TEST_QUIZ_ID,
            sessionCode: TEST_SESSION_CODE,
            user: TEST_HOST_USER
        });

        // Verify no error
        assert.ok(!result.error, `Should not return error: ${result.error || 'none'}`);

        // Verify session was paused
        const session = await sessionStore.getSession(TEST_SESSION_CODE);
        assert.strictEqual(session.isPaused, true, 'Session should be paused');

        // Verify broadcast was sent
        const pauseEvents = emittedEvents.filter(e => e.event === 'quiz_paused');
        assert.ok(pauseEvents.length > 0, 'Should broadcast quiz_paused event');
    });

    it('should have host:resume handler and resume session', async () => {
        // First pause the session
        const session = await sessionStore.getSession(TEST_SESSION_CODE);
        session.isPaused = true;
        session.pausedAt = Date.now();
        session.timeLeftOnPause = 5000;
        await sessionStore.setSession(TEST_SESSION_CODE, session);

        // Call the service method directly
        const result = await quizService.resumeQuizSession({
            io: mockIo,
            quizId: TEST_QUIZ_ID,
            sessionCode: TEST_SESSION_CODE,
            user: TEST_HOST_USER
        });

        // Verify no error
        assert.ok(!result.error, `Should not return error: ${result.error || 'none'}`);

        // Verify session was resumed
        const updatedSession = await sessionStore.getSession(TEST_SESSION_CODE);
        assert.strictEqual(updatedSession.isPaused, false, 'Session should be resumed');

        // Verify broadcast was sent
        const resumeEvents = emittedEvents.filter(e => e.event === 'quiz_resumed');
        assert.ok(resumeEvents.length > 0, 'Should broadcast quiz_resumed event');
    });

    it('should broadcast question state changes within 1 second (Requirement 2.5)', async () => {
        const startTime = Date.now();

        // Trigger state change via advanceQuizQuestion
        await quizService.advanceQuizQuestion({
            io: mockIo,
            quizId: TEST_QUIZ_ID,
            sessionCode: TEST_SESSION_CODE,
            user: TEST_HOST_USER
        });

        const elapsed = Date.now() - startTime;

        // Verify broadcast timing (Requirement 2.5)
        assert.ok(elapsed < 1000, `Broadcast time ${elapsed}ms should be < 1000ms`);

        // Verify broadcasts were sent
        const questionEvents = emittedEvents.filter(e => 
            e.event === 'new_question' || e.event === 'question:update'
        );
        assert.ok(questionEvents.length > 0, 'Should receive broadcast within 1 second');
    });

    it('should reject unauthorized users for host:next-question', async () => {
        // Attempt to advance question as participant (not host)
        const result = await quizService.advanceQuizQuestion({
            io: mockIo,
            quizId: TEST_QUIZ_ID,
            sessionCode: TEST_SESSION_CODE,
            user: TEST_PARTICIPANT_USER
        });

        // Verify error was returned
        assert.ok(result.error, 'Should return error for unauthorized user');
        assert.strictEqual(result.error, 'Forbidden', 'Error should be "Forbidden"');
        assert.strictEqual(result.statusCode, 403, 'Status code should be 403');

        // Verify session was NOT advanced
        const session = await sessionStore.getSession(TEST_SESSION_CODE);
        assert.strictEqual(session.currentQuestionIndex, 0, 'Question should not advance for unauthorized user');
    });

    it('should reject unauthorized users for host:pause', async () => {
        // Attempt to pause as participant (not host)
        const result = await quizService.pauseQuizSession({
            io: mockIo,
            quizId: TEST_QUIZ_ID,
            sessionCode: TEST_SESSION_CODE,
            user: TEST_PARTICIPANT_USER
        });

        // Verify error was returned
        assert.ok(result.error, 'Should return error for unauthorized user');
        assert.strictEqual(result.error, 'Forbidden', 'Error should be "Forbidden"');

        // Verify session was NOT paused
        const session = await sessionStore.getSession(TEST_SESSION_CODE);
        assert.strictEqual(session.isPaused, false, 'Session should not be paused by unauthorized user');
    });

    it('should reject unauthorized users for host:resume', async () => {
        // First pause the session
        const session = await sessionStore.getSession(TEST_SESSION_CODE);
        session.isPaused = true;
        session.pausedAt = Date.now();
        session.timeLeftOnPause = 5000;
        await sessionStore.setSession(TEST_SESSION_CODE, session);

        // Attempt to resume as participant (not host)
        const result = await quizService.resumeQuizSession({
            io: mockIo,
            quizId: TEST_QUIZ_ID,
            sessionCode: TEST_SESSION_CODE,
            user: TEST_PARTICIPANT_USER
        });

        // Verify error was returned
        assert.ok(result.error, 'Should return error for unauthorized user');
        assert.strictEqual(result.error, 'Forbidden', 'Error should be "Forbidden"');

        // Verify session is still paused
        const updatedSession = await sessionStore.getSession(TEST_SESSION_CODE);
        assert.strictEqual(updatedSession.isPaused, true, 'Session should remain paused for unauthorized user');
    });

    it('should verify socket handlers exist in question.handler.js', async () => {
        // Read the question handler file to verify the socket event handlers exist
        const fs = require('fs');
        const path = require('path');
        const handlerPath = path.join(__dirname, '../sockets/handlers/question.handler.js');
        const handlerContent = fs.readFileSync(handlerPath, 'utf8');

        // Verify all three required event handlers exist
        assert.ok(handlerContent.includes("socket.on('host:next-question'"), 
            'Should have host:next-question event handler');
        assert.ok(handlerContent.includes("socket.on('host:pause'"), 
            'Should have host:pause event handler');
        assert.ok(handlerContent.includes("socket.on('host:resume'"), 
            'Should have host:resume event handler');

        // Verify they call the correct service methods
        assert.ok(handlerContent.includes('advanceQuizQuestion'), 
            'host:next-question should call advanceQuizQuestion');
        assert.ok(handlerContent.includes('pauseQuizSession'), 
            'host:pause should call pauseQuizSession');
        assert.ok(handlerContent.includes('resumeQuizSession'), 
            'host:resume should call resumeQuizSession');
    });
});
