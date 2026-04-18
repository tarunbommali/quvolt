/**
 * Integration Tests: Session Recovery
 *
 * Tests the interaction between sessionRecovery.js and statePersistence.js
 * to validate Requirements 3.1, 3.2, and 3.3.
 *
 * Req 3.1 - Quiz_Engine SHALL restore all active sessions from the database on restart
 * Req 3.2 - Quiz_Engine SHALL reconnect participants who rejoin within 5 minutes
 * Req 3.3 - Quiz_Engine SHALL persist question state updates within 2 seconds of any change
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const QuizSession = require('../models/QuizSession');
const Quiz = require('../models/Quiz');
const Submission = require('../models/Submission');
const User = require('../models/User');
const sessionStore = require('../services/session/session.service');
const {
    restoreActiveSessions,
    restoreSingleSession,
    handleParticipantReconnection,
    loadParticipantData,
    loadLeaderboardData,
} = require('../services/session/sessionRecovery');
const {
    persistSessionStateTransition,
    executeWithRetry,
    processFailedOperationsQueue,
    getQueueSize,
    getQueue,
} = require('../services/session/statePersistence');
const { SESSION_STATUS } = require('../utils/sessionStateMachine');

let mongoServer;

// Shared mock io instance
const mockIo = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const createQuizWithQuestions = async (overrides = {}) => {
    return Quiz.create({
        title: 'Integration Test Quiz',
        hostId: new mongoose.Types.ObjectId(),
        questions: [
            {
                text: 'What is 2 + 2?',
                options: ['3', '4', '5', '6'],
                correctOption: 1,
                hashedCorrectAnswer: 'hash_4',
                timeLimit: 30,
            },
            {
                text: 'Capital of France?',
                options: ['Berlin', 'Madrid', 'Paris', 'Rome'],
                correctOption: 2,
                hashedCorrectAnswer: 'hash_paris',
                timeLimit: 20,
            },
        ],
        mode: 'auto',
        status: 'live',
        ...overrides,
    });
};

const createActiveSession = async (quiz, overrides = {}) => {
    return QuizSession.create({
        quizId: quiz._id,
        sessionCode: `SES${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        status: SESSION_STATUS.LIVE,
        mode: 'auto',
        currentQuestionIndex: 0,
        questionState: 'live',
        templateSnapshot: { questions: quiz.questions },
        ...overrides,
    });
};

const createUser = async (name, email) => {
    return User.create({
        name,
        email,
        password: 'password123',
        role: 'participant',
    });
};

const createSubmission = async (userId, quizId, sessionId, sessionCode, questionId, overrides = {}) => {
    return Submission.create({
        userId,
        quizId,
        sessionId,
        roomCode: sessionCode,
        questionId,
        selectedOption: 'A',
        timeTaken: 5,
        score: 100,
        isCorrect: true,
        ...overrides,
    });
};

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    await QuizSession.deleteMany({});
    await Quiz.deleteMany({});
    await Submission.deleteMany({});
    await User.deleteMany({});
    jest.clearAllMocks();
});

// ─── Req 3.1: Session Restoration After Restart ──────────────────────────────

describe('Req 3.1 – Session restoration after restart', () => {
    it('restores multiple active sessions (WAITING + LIVE) from the database', async () => {
        const quiz1 = await createQuizWithQuestions();
        const quiz2 = await createQuizWithQuestions({ title: 'Quiz 2' });

        const session1 = await createActiveSession(quiz1, { status: SESSION_STATUS.LIVE });
        const session2 = await createActiveSession(quiz2, { status: SESSION_STATUS.WAITING });

        const stats = await restoreActiveSessions(mockIo);

        expect(stats.total).toBe(2);
        expect(stats.restored).toBe(2);
        expect(stats.aborted).toBe(0);
        expect(stats.errors).toHaveLength(0);

        // Both sessions should now exist in the in-memory store
        const restored1 = await sessionStore.getSession(session1.sessionCode);
        const restored2 = await sessionStore.getSession(session2.sessionCode);

        expect(restored1).not.toBeNull();
        expect(restored1.status).toBe(SESSION_STATUS.LIVE);
        expect(restored2).not.toBeNull();
        expect(restored2.status).toBe(SESSION_STATUS.WAITING);
    });

    it('does not restore completed or aborted sessions', async () => {
        const quiz = await createQuizWithQuestions();
        await createActiveSession(quiz, { status: SESSION_STATUS.COMPLETED });
        await createActiveSession(quiz, { status: SESSION_STATUS.ABORTED });

        const stats = await restoreActiveSessions(mockIo);

        expect(stats.total).toBe(0);
        expect(stats.restored).toBe(0);
    });

    it('aborts sessions that have no questions and cannot be restored', async () => {
        // Session with no templateSnapshot and no quiz questions
        const session = await QuizSession.create({
            quizId: new mongoose.Types.ObjectId(),
            sessionCode: 'NOQUIZ1',
            status: SESSION_STATUS.LIVE,
            mode: 'auto',
        });

        const stats = await restoreActiveSessions(mockIo);

        expect(stats.total).toBe(1);
        expect(stats.restored).toBe(0);
        expect(stats.aborted).toBe(1);

        const aborted = await QuizSession.findById(session._id);
        expect(aborted.status).toBe(SESSION_STATUS.ABORTED);
        expect(aborted.endedAt).not.toBeNull();
    });

    it('restores session with correct question index and paused state', async () => {
        const quiz = await createQuizWithQuestions();
        const questionExpiry = new Date(Date.now() + 20000);

        const session = await createActiveSession(quiz, {
            currentQuestionIndex: 1,
            isPaused: true,
            questionState: 'paused',
            questionExpiry,
        });

        await restoreActiveSessions(mockIo);

        const restored = await sessionStore.getSession(session.sessionCode);
        expect(restored.currentQuestionIndex).toBe(1);
        expect(restored.isPaused).toBe(true);
        // questionExpiry is restored as a timestamp
        expect(restored.questionExpiry).toBeGreaterThan(Date.now());
        // timeLeftOnPause requires pausedAt which is not persisted in the schema;
        // the service sets it to null when pausedAt is unavailable
        expect(restored.timeLeftOnPause).toBeNull();
    });

    it('restores participant and leaderboard data from submissions', async () => {
        const quiz = await createQuizWithQuestions();
        const session = await createActiveSession(quiz);
        const user = await createUser('Alice', 'alice@test.com');

        await createSubmission(
            user._id, quiz._id, session._id, session.sessionCode,
            quiz.questions[0]._id,
            { score: 120, isCorrect: true, timeTaken: 8 }
        );

        await restoreActiveSessions(mockIo);

        const restored = await sessionStore.getSession(session.sessionCode);
        expect(restored.participants[user._id.toString()]).toBeDefined();
        expect(restored.participants[user._id.toString()].name).toBe('Alice');
        expect(restored.leaderboard[user._id.toString()]).toBeDefined();
        expect(restored.leaderboard[user._id.toString()].score).toBe(120);
    });

    it('skips sessions already present in the session store', async () => {
        const quiz = await createQuizWithQuestions();
        const session = await createActiveSession(quiz);

        // Pre-populate the store as if it was never cleared
        await sessionStore.setSession(session.sessionCode, {
            status: SESSION_STATUS.LIVE,
            alreadyRestored: true,
        });

        const stats = await restoreActiveSessions(mockIo);

        // restoreSingleSession warns and returns early – counts as restored=0 for this session
        // but the existing store entry should be untouched
        const stored = await sessionStore.getSession(session.sessionCode);
        expect(stored.alreadyRestored).toBe(true);
    });
});

// ─── Req 3.2: Participant Reconnection ───────────────────────────────────────

describe('Req 3.2 – Participant reconnection within 5 minutes', () => {
    const buildSessionInStore = async (sessionCode, userId, overrides = {}) => {
        const sessionId = new mongoose.Types.ObjectId().toString();
        const session = {
            status: SESSION_STATUS.LIVE,
            mode: 'auto',
            currentQuestionIndex: 0,
            isPaused: false,
            participants: {
                [userId]: { _id: userId, name: 'Test User' },
            },
            leaderboard: {
                [userId]: { userId, name: 'Test User', score: 200, time: 30, streak: 2, bestStreak: 2 },
            },
            questions: [
                { _id: 'q1', text: 'Q1', options: ['A', 'B'], timeLimit: 30 },
                { _id: 'q2', text: 'Q2', options: ['C', 'D'], timeLimit: 20 },
            ],
            questionExpiry: Date.now() + 15000,
            lastActivity: Date.now(),
            sessionId,
            ...overrides,
        };
        await sessionStore.setSession(sessionCode, session);
        return session;
    };

    it('reconnects a participant who rejoins within the 5-minute window', async () => {
        const userId = new mongoose.Types.ObjectId().toString();
        const sessionCode = 'RECON01';
        await buildSessionInStore(sessionCode, userId);

        const user = { _id: userId, name: 'Test User' };
        const result = await handleParticipantReconnection({}, sessionCode, user);

        expect(result.reconnected).toBe(true);
        expect(result.sessionStatus).toBe(SESSION_STATUS.LIVE);
        expect(result.userStats.score).toBe(200);
        expect(result.currentQuestion).toBeDefined();
        expect(result.currentQuestion.text).toBe('Q1');
    });

    it('restores submission history on reconnection', async () => {
        const quiz = await createQuizWithQuestions();
        const user = await createUser('Bob', 'bob@test.com');
        const sessionId = new mongoose.Types.ObjectId();
        const sessionCode = 'RECON02';

        await createSubmission(
            user._id, quiz._id, sessionId, sessionCode,
            quiz.questions[0]._id,
            { score: 80, isCorrect: true }
        );

        await buildSessionInStore(sessionCode, user._id.toString(), { sessionId: sessionId.toString() });

        const result = await handleParticipantReconnection({}, sessionCode, { _id: user._id.toString(), name: 'Bob' });

        expect(result.reconnected).toBe(true);
        expect(result.submissionHistory).toHaveLength(1);
        expect(result.submissionHistory[0].isCorrect).toBe(true);
        expect(result.submissionHistory[0].score).toBe(80);
    });

    it('rejects reconnection when the 5-minute window has expired', async () => {
        const userId = new mongoose.Types.ObjectId().toString();
        const sessionCode = 'RECON03';
        await buildSessionInStore(sessionCode, userId, {
            lastActivity: Date.now() - 6 * 60 * 1000, // 6 minutes ago
        });

        const result = await handleParticipantReconnection({}, sessionCode, { _id: userId, name: 'Late User' });

        expect(result.reconnected).toBe(false);
        expect(result.reason).toBe('reconnection_window_expired');
    });

    it('rejects reconnection for a user who was never in the session', async () => {
        const originalUserId = new mongoose.Types.ObjectId().toString();
        const strangerUserId = new mongoose.Types.ObjectId().toString();
        const sessionCode = 'RECON04';
        await buildSessionInStore(sessionCode, originalUserId);

        const result = await handleParticipantReconnection({}, sessionCode, { _id: strangerUserId, name: 'Stranger' });

        expect(result.reconnected).toBe(false);
        expect(result.reason).toBe('not_previous_participant');
    });

    it('returns session_not_found when session does not exist in store', async () => {
        const result = await handleParticipantReconnection({}, 'NOSESSION', {
            _id: new mongoose.Types.ObjectId().toString(),
            name: 'Ghost',
        });

        expect(result.reconnected).toBe(false);
        expect(result.reason).toBe('session_not_found');
    });

    it('restores correct question when reconnecting mid-session', async () => {
        const userId = new mongoose.Types.ObjectId().toString();
        const sessionCode = 'RECON05';
        await buildSessionInStore(sessionCode, userId, { currentQuestionIndex: 1 });

        const result = await handleParticipantReconnection({}, sessionCode, { _id: userId, name: 'Mid User' });

        expect(result.reconnected).toBe(true);
        expect(result.currentQuestion.text).toBe('Q2');
        expect(result.currentQuestion.index).toBe(1);
    });

    it('returns isPaused flag correctly on reconnection', async () => {
        const userId = new mongoose.Types.ObjectId().toString();
        const sessionCode = 'RECON06';
        await buildSessionInStore(sessionCode, userId, { isPaused: true });

        const result = await handleParticipantReconnection({}, sessionCode, { _id: userId, name: 'Paused User' });

        expect(result.reconnected).toBe(true);
        expect(result.isPaused).toBe(true);
    });
});

// ─── Req 3.3: State Persistence Retry Logic ──────────────────────────────────

describe('Req 3.3 – State persistence retry logic', () => {
    it('persists a session state transition successfully on first attempt', async () => {
        const quiz = await createQuizWithQuestions();
        const session = await createActiveSession(quiz, {
            sessionCode: 'PERSIST1',
            status: SESSION_STATUS.WAITING,
        });

        const start = Date.now();
        const result = await persistSessionStateTransition('PERSIST1', SESSION_STATUS.LIVE, {
            currentQuestionIndex: 0,
        });
        const elapsed = Date.now() - start;

        expect(result.status).toBe(SESSION_STATUS.LIVE);
        expect(result.currentQuestionIndex).toBe(0);
        // Should complete well within the 2-second requirement
        expect(elapsed).toBeLessThan(2000);
    });

    it('retries a transient failure and eventually persists the state', async () => {
        let callCount = 0;
        const operation = jest.fn().mockImplementation(() => {
            callCount++;
            if (callCount < 3) throw new Error('Transient DB error');
            return Promise.resolve({ status: 'live' });
        });

        const result = await executeWithRetry(operation, { op: 'test' }, 3);

        expect(result.status).toBe('live');
        expect(operation).toHaveBeenCalledTimes(3);
    });

    it('queues the operation after exhausting all retries', async () => {
        const alwaysFails = jest.fn().mockRejectedValue(new Error('Persistent DB failure'));

        await expect(
            executeWithRetry(alwaysFails, { op: 'queue-test' }, 2)
        ).rejects.toThrow('Persistent DB failure');

        expect(getQueueSize()).toBeGreaterThan(0);
    });

    it('processes the failed operations queue and succeeds on retry', async () => {
        // Force an operation into the queue
        const operation = jest.fn().mockRejectedValue(new Error('DB down'));
        try {
            await executeWithRetry(operation, { op: 'queue-process' }, 2);
        } catch {
            // expected
        }

        const queueSizeBefore = getQueueSize();
        expect(queueSizeBefore).toBeGreaterThan(0);

        // Now make the operation succeed
        operation.mockResolvedValue('recovered');

        const stats = await processFailedOperationsQueue();

        expect(stats.processed).toBeGreaterThanOrEqual(1);
        expect(stats.succeeded).toBeGreaterThanOrEqual(1);
    });

    it('does not retry validation errors – fails immediately', async () => {
        const validationError = Object.assign(new Error('Invalid field'), { name: 'ValidationError' });
        const operation = jest.fn().mockRejectedValue(validationError);

        await expect(
            executeWithRetry(operation, { op: 'validation' }, 3)
        ).rejects.toThrow('Invalid field');

        // Should only be called once – no retries for validation errors
        expect(operation).toHaveBeenCalledTimes(1);
    });

    it('persists session state transition and reflects change in the database', async () => {
        const quiz = await createQuizWithQuestions();
        await createActiveSession(quiz, {
            sessionCode: 'PERSIST2',
            status: SESSION_STATUS.WAITING,
        });

        await persistSessionStateTransition('PERSIST2', SESSION_STATUS.LIVE);

        const updated = await QuizSession.findOne({ sessionCode: 'PERSIST2' });
        expect(updated.status).toBe(SESSION_STATUS.LIVE);
    });

    it('integrates recovery + persistence: restores session then persists a state change', async () => {
        const quiz = await createQuizWithQuestions();
        const session = await createActiveSession(quiz, {
            sessionCode: 'INTEG01',
            status: SESSION_STATUS.LIVE,
        });

        // Step 1: Simulate restart – restore session from DB to store
        const stats = await restoreActiveSessions(mockIo);
        expect(stats.restored).toBe(1);

        const restored = await sessionStore.getSession('INTEG01');
        expect(restored).not.toBeNull();

        // Step 2: Persist a state change (e.g., session completes)
        const start = Date.now();
        const result = await persistSessionStateTransition('INTEG01', SESSION_STATUS.COMPLETED, {
            endedAt: new Date(),
        });
        const elapsed = Date.now() - start;

        expect(result.status).toBe(SESSION_STATUS.COMPLETED);
        expect(elapsed).toBeLessThan(2000);

        // Verify DB reflects the change
        const dbSession = await QuizSession.findOne({ sessionCode: 'INTEG01' });
        expect(dbSession.status).toBe(SESSION_STATUS.COMPLETED);
    });
});
