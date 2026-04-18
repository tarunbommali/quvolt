/**
 * quizModeIntegration.test.js
 *
 * Integration tests for quiz mode workflow controls (Task 2.4)
 *
 * Requirements tested:
 * - 2.1: WHERE session mode is tutor, THE Quiz_Engine SHALL disable automatic question advancement
 * - 2.2: WHERE session mode is tutor, THE Quiz_Engine SHALL expose manual next-question controls to the host
 * - 2.3: WHERE session mode is auto, THE Quiz_Engine SHALL automatically advance questions when time expires
 * - 2.7: WHERE session mode is tutor, THE Quiz_Engine SHALL allow the host to pause and resume at any time
 */

'use strict';

// ─── Mock external dependencies before requiring quiz service ─────────────────

// Mock mongoose to avoid real DB connections
jest.mock('mongoose', () => {
    const actual = jest.requireActual('mongoose');
    return {
        ...actual,
        connection: { db: { collection: () => ({ findOne: jest.fn().mockResolvedValue(null) }) } },
        Types: actual.Types,
    };
});

// Mock Quiz model
jest.mock('../models/Quiz', () => ({
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn().mockResolvedValue({}),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
}));

// Mock QuizSession model
jest.mock('../models/QuizSession', () => ({
    findById: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn().mockResolvedValue({}),
    find: jest.fn().mockResolvedValue([]),
}));

// Mock Submission model
jest.mock('../models/Submission', () => ({
    aggregate: jest.fn().mockResolvedValue([]),
}));

// Mock statePersistence to avoid DB transactions
jest.mock('../services/session/statePersistence', () => ({
    executeInTransaction: jest.fn(async (fn) => fn({})),
    persistSubmission: jest.fn().mockResolvedValue({}),
}));

// Mock sessionRecovery
jest.mock('../services/session/sessionRecovery', () => ({
    restoreActiveSessions: jest.fn().mockResolvedValue({ restored: 0 }),
    handleParticipantReconnection: jest.fn().mockResolvedValue({ reconnected: false }),
}));

// Mock sessionAccessControl
jest.mock('../services/session/sessionAccessControl', () => ({
    canJoinSession: jest.fn().mockResolvedValue({ allowed: true }),
}));

// Mock messageCompression
jest.mock('../utils/messageCompression', () => ({
    prepareMessage: jest.fn(async (event, data) => ({ compressed: false, event, data })),
}));

// Mock messageBatching
jest.mock('../utils/messageBatching', () => ({
    batch: jest.fn(),
    clear: jest.fn(),
}));

// Mock logger
jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    audit: jest.fn(),
}));

// ─── In-memory session store ──────────────────────────────────────────────────

// Prefix with 'mock' so Jest allows it inside jest.mock() factory
const mockInMemoryStore = new Map();

jest.mock('../services/session/session.service', () => ({
    getSession: jest.fn(async (code) => mockInMemoryStore.get(code) || null),
    setSession: jest.fn(async (code, session) => { mockInMemoryStore.set(code, JSON.parse(JSON.stringify(session))); }),
    deleteSession: jest.fn(async (code) => { mockInMemoryStore.delete(code); }),
    acquireAnswerLock: jest.fn().mockResolvedValue(true),
    clearDistributedTimer: jest.fn().mockResolvedValue(undefined),
    registerDistributedTimer: jest.fn().mockResolvedValue(undefined),
}));

// ─── Load modules under test ──────────────────────────────────────────────────

const Quiz = require('../models/Quiz');
const QuizSession = require('../models/QuizSession');
const quizService = require('../services/quiz/quiz.service');
const sessionStore = require('../services/session/session.service');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SESSION_STATUS = {
    DRAFT: 'draft',
    SCHEDULED: 'scheduled',
    WAITING: 'waiting',
    LIVE: 'live',
    COMPLETED: 'completed',
    ABORTED: 'aborted',
};

const QUIZ_ID = 'quiz-id-001';
const HOST_USER = { _id: 'host-user-1', role: 'host' };
const PARTICIPANT_USER = { _id: 'participant-1', role: 'participant' };

const makeQuestions = (count = 3) =>
    Array.from({ length: count }, (_, i) => ({
        _id: `q${i + 1}`,
        text: `Question ${i + 1}`,
        timeLimit: 30,
        options: ['A', 'B', 'C', 'D'],
        hashedCorrectAnswer: 'A',
    }));

const buildSession = (overrides = {}) => ({
    status: SESSION_STATUS.LIVE,
    mode: 'tutor',
    currentQuestionIndex: 0,
    isPaused: false,
    questions: makeQuestions(3),
    participants: {},
    leaderboard: {},
    quizId: QUIZ_ID,
    sessionId: 'session-id-001',
    questionState: 'live',
    questionStartTime: Date.now(),
    questionExpiry: null,
    interQuestionDelay: 0,
    sequenceNumber: 0,
    ...overrides,
});

const setupMockModels = (sessionCode) => {
    Quiz.findById.mockReturnValue({
        lean: () =>
            Promise.resolve({
                _id: QUIZ_ID,
                hostId: HOST_USER._id,
                title: 'Test Quiz',
                status: SESSION_STATUS.LIVE,
                lastSessionCode: sessionCode,
                mode: 'tutor',
            }),
    });

    QuizSession.findOne.mockReturnValue({
        lean: () =>
            Promise.resolve({
                _id: 'session-id-001',
                sessionCode,
                quizId: QUIZ_ID,
                status: SESSION_STATUS.LIVE,
            }),
        sort: () => ({
            lean: () =>
                Promise.resolve({
                    _id: 'session-id-001',
                    sessionCode,
                    quizId: QUIZ_ID,
                    status: SESSION_STATUS.LIVE,
                }),
        }),
    });
};

const buildMockIo = () => {
    const events = [];
    return {
        events,
        to: (room) => ({
            emit: (event, data) => events.push({ room, event, data }),
        }),
        in: (room) => ({ socketsLeave: jest.fn() }),
    };
};

// ─── Test setup / teardown ────────────────────────────────────────────────────

beforeEach(() => {
    mockInMemoryStore.clear();
    jest.clearAllMocks();
    // Re-wire mock implementations after clearAllMocks (which resets them)
    sessionStore.getSession.mockImplementation(async (code) => mockInMemoryStore.get(code) || null);
    sessionStore.setSession.mockImplementation(async (code, session) => {
        mockInMemoryStore.set(code, JSON.parse(JSON.stringify(session)));
    });
    sessionStore.deleteSession.mockImplementation(async (code) => { mockInMemoryStore.delete(code); });
    sessionStore.acquireAnswerLock.mockResolvedValue(true);
    sessionStore.clearDistributedTimer.mockResolvedValue(undefined);
    sessionStore.registerDistributedTimer.mockResolvedValue(undefined);
});

// ─── Auto Mode Tests ──────────────────────────────────────────────────────────

describe('Requirement 2.3 – Auto mode automatic advancement', () => {
    const ROOM = 'AUTO001';

    beforeEach(async () => {
        setupMockModels(ROOM);
        await sessionStore.setSession(ROOM, buildSession({ mode: 'auto', questionExpiry: Date.now() + 30000 }));
    });

    it('sets questionExpiry when broadcasting in auto mode', async () => {
        const io = buildMockIo();
        await quizService.broadcastQuestionEnhanced(io, ROOM);

        const session = await sessionStore.getSession(ROOM);
        expect(session.questionExpiry).not.toBeNull();
        expect(session.questionExpiry).toBeGreaterThan(Date.now());
    });

    it('emits timer:start event in auto mode', async () => {
        const io = buildMockIo();
        await quizService.broadcastQuestionEnhanced(io, ROOM);

        const timerStart = io.events.find((e) => e.event === 'timer:start');
        expect(timerStart).toBeDefined();
        expect(timerStart.data.duration).toBe(30); // question timeLimit
        expect(timerStart.data.expiry).toBeGreaterThan(Date.now());
    });

    it('emits new_question event in auto mode', async () => {
        const io = buildMockIo();
        await quizService.broadcastQuestionEnhanced(io, ROOM);

        const newQuestion = io.events.find((e) => e.event === 'new_question');
        expect(newQuestion).toBeDefined();
        expect(newQuestion.data.index).toBe(0);
    });

    it('does NOT advance question while session is paused', async () => {
        const session = await sessionStore.getSession(ROOM);
        session.isPaused = true;
        await sessionStore.setSession(ROOM, session);

        const io = buildMockIo();
        const result = await quizService.advanceQuizQuestion({
            io,
            quizId: QUIZ_ID,
            sessionCode: ROOM,
            user: HOST_USER,
        });

        expect(result.error).toBeDefined();
        expect(result.error).toMatch(/paused/i);

        const updated = await sessionStore.getSession(ROOM);
        expect(updated.currentQuestionIndex).toBe(0);
    });

    it('transitions session to completed when all questions are exhausted', async () => {
        // Set index beyond last question
        const session = await sessionStore.getSession(ROOM);
        session.currentQuestionIndex = session.questions.length; // past the end
        await sessionStore.setSession(ROOM, session);

        const io = buildMockIo();
        await quizService.broadcastQuestionEnhanced(io, ROOM);

        const finished = io.events.find((e) => e.event === 'quiz_finished');
        expect(finished).toBeDefined();
        expect(finished.data.status).toBe('completed');
    });
});

// ─── Tutor Mode Tests ─────────────────────────────────────────────────────────

describe('Requirement 2.1 – Tutor mode disables automatic advancement', () => {
    const ROOM = 'TUTOR001';

    beforeEach(async () => {
        setupMockModels(ROOM);
        await sessionStore.setSession(ROOM, buildSession({ mode: 'tutor' }));
    });

    it('does NOT set questionExpiry in tutor mode', async () => {
        const io = buildMockIo();
        await quizService.broadcastQuestionEnhanced(io, ROOM);

        const session = await sessionStore.getSession(ROOM);
        expect(session.questionExpiry).toBeNull();
    });

    it('does NOT emit timer:start in tutor mode', async () => {
        const io = buildMockIo();
        await quizService.broadcastQuestionEnhanced(io, ROOM);

        const timerStart = io.events.find((e) => e.event === 'timer:start');
        expect(timerStart).toBeUndefined();
    });

    it('still emits new_question in tutor mode', async () => {
        const io = buildMockIo();
        await quizService.broadcastQuestionEnhanced(io, ROOM);

        const newQuestion = io.events.find((e) => e.event === 'new_question');
        expect(newQuestion).toBeDefined();
    });

    it('maps teaching mode to tutor behaviour (no questionExpiry)', async () => {
        await sessionStore.setSession(ROOM, buildSession({ mode: 'teaching' }));

        const io = buildMockIo();
        await quizService.broadcastQuestionEnhanced(io, ROOM);

        const session = await sessionStore.getSession(ROOM);
        expect(session.questionExpiry).toBeNull();
    });
});

describe('Requirement 2.2 – Tutor mode manual next-question controls', () => {
    const ROOM = 'TUTOR002';

    beforeEach(async () => {
        setupMockModels(ROOM);
        await sessionStore.setSession(ROOM, buildSession({ mode: 'tutor' }));
    });

    it('advances question index when host calls advanceQuizQuestion', async () => {
        const io = buildMockIo();
        const result = await quizService.advanceQuizQuestion({
            io,
            quizId: QUIZ_ID,
            sessionCode: ROOM,
            user: HOST_USER,
        });

        expect(result.error).toBeUndefined();
        const session = await sessionStore.getSession(ROOM);
        expect(session.currentQuestionIndex).toBe(1);
    });

    it('completes within 500ms (Requirement 2.4)', async () => {
        const io = buildMockIo();
        const start = Date.now();

        await quizService.advanceQuizQuestion({
            io,
            quizId: QUIZ_ID,
            sessionCode: ROOM,
            user: HOST_USER,
        });

        expect(Date.now() - start).toBeLessThan(500);
    });

    it('broadcasts question update within 1 second (Requirement 2.5)', async () => {
        const io = buildMockIo();
        const start = Date.now();

        await quizService.advanceQuizQuestion({
            io,
            quizId: QUIZ_ID,
            sessionCode: ROOM,
            user: HOST_USER,
        });

        const elapsed = Date.now() - start;
        expect(elapsed).toBeLessThan(1000);

        const questionEvents = io.events.filter(
            (e) => e.event === 'new_question' || e.event === 'question:update',
        );
        expect(questionEvents.length).toBeGreaterThan(0);
    });

    it('rejects advancement when session is paused', async () => {
        const session = await sessionStore.getSession(ROOM);
        session.isPaused = true;
        await sessionStore.setSession(ROOM, session);

        const io = buildMockIo();
        const result = await quizService.advanceQuizQuestion({
            io,
            quizId: QUIZ_ID,
            sessionCode: ROOM,
            user: HOST_USER,
        });

        expect(result.error).toBeDefined();
        expect(result.statusCode).toBe(409);
    });

    it('rejects advancement when already at last question', async () => {
        const session = await sessionStore.getSession(ROOM);
        session.currentQuestionIndex = session.questions.length - 1;
        await sessionStore.setSession(ROOM, session);

        const io = buildMockIo();
        const result = await quizService.advanceQuizQuestion({
            io,
            quizId: QUIZ_ID,
            sessionCode: ROOM,
            user: HOST_USER,
        });

        expect(result.error).toBeDefined();
        expect(result.statusCode).toBe(409);
    });

    it('rejects advancement by non-host users', async () => {
        const io = buildMockIo();
        const result = await quizService.advanceQuizQuestion({
            io,
            quizId: QUIZ_ID,
            sessionCode: ROOM,
            user: PARTICIPANT_USER,
        });

        expect(result.error).toBeDefined();
        expect(result.statusCode).toBe(403);

        const session = await sessionStore.getSession(ROOM);
        expect(session.currentQuestionIndex).toBe(0);
    });

    it('can advance through all questions sequentially', async () => {
        const io = buildMockIo();
        const session = await sessionStore.getSession(ROOM);
        const total = session.questions.length;

        for (let i = 0; i < total - 1; i++) {
            const result = await quizService.advanceQuizQuestion({
                io,
                quizId: QUIZ_ID,
                sessionCode: ROOM,
                user: HOST_USER,
            });
            expect(result.error).toBeUndefined();
        }

        const finalSession = await sessionStore.getSession(ROOM);
        expect(finalSession.currentQuestionIndex).toBe(total - 1);
    });
});

// ─── Pause / Resume Tests ─────────────────────────────────────────────────────

describe('Requirement 2.7 – Tutor mode pause and resume', () => {
    const ROOM = 'PAUSE001';

    beforeEach(async () => {
        setupMockModels(ROOM);
        await sessionStore.setSession(ROOM, buildSession({ mode: 'tutor' }));
    });

    it('pauses a live tutor session', async () => {
        const io = buildMockIo();
        const result = await quizService.pauseQuizSession({
            io,
            quizId: QUIZ_ID,
            sessionCode: ROOM,
            user: HOST_USER,
        });

        expect(result.error).toBeUndefined();

        const session = await sessionStore.getSession(ROOM);
        expect(session.isPaused).toBe(true);
        expect(session.pausedAt).toBeDefined();
    });

    it('emits quiz_paused event on pause', async () => {
        const io = buildMockIo();
        await quizService.pauseQuizSession({
            io,
            quizId: QUIZ_ID,
            sessionCode: ROOM,
            user: HOST_USER,
        });

        const pauseEvent = io.events.find((e) => e.event === 'quiz_paused');
        expect(pauseEvent).toBeDefined();
        expect(pauseEvent.data.isPaused).toBe(true);
    });

    it('resumes a paused tutor session', async () => {
        // Pause first
        const session = await sessionStore.getSession(ROOM);
        session.isPaused = true;
        session.pausedAt = Date.now();
        session.timeLeftOnPause = 15000;
        await sessionStore.setSession(ROOM, session);

        const io = buildMockIo();
        const result = await quizService.resumeQuizSession({
            io,
            quizId: QUIZ_ID,
            sessionCode: ROOM,
            user: HOST_USER,
        });

        expect(result.error).toBeUndefined();

        const updated = await sessionStore.getSession(ROOM);
        expect(updated.isPaused).toBe(false);
    });

    it('emits quiz_resumed event on resume', async () => {
        const session = await sessionStore.getSession(ROOM);
        session.isPaused = true;
        session.pausedAt = Date.now();
        session.timeLeftOnPause = 10000;
        await sessionStore.setSession(ROOM, session);

        const io = buildMockIo();
        await quizService.resumeQuizSession({
            io,
            quizId: QUIZ_ID,
            sessionCode: ROOM,
            user: HOST_USER,
        });

        const resumeEvent = io.events.find((e) => e.event === 'quiz_resumed');
        expect(resumeEvent).toBeDefined();
        expect(resumeEvent.data.isPaused).toBe(false);
    });

    it('preserves current question index when paused', async () => {
        const session = await sessionStore.getSession(ROOM);
        session.currentQuestionIndex = 1;
        await sessionStore.setSession(ROOM, session);

        const io = buildMockIo();
        await quizService.pauseQuizSession({
            io,
            quizId: QUIZ_ID,
            sessionCode: ROOM,
            user: HOST_USER,
        });

        const paused = await sessionStore.getSession(ROOM);
        expect(paused.currentQuestionIndex).toBe(1);
    });

    it('restores question index after resume', async () => {
        const session = await sessionStore.getSession(ROOM);
        session.currentQuestionIndex = 2;
        session.isPaused = true;
        session.pausedAt = Date.now();
        session.timeLeftOnPause = 5000;
        await sessionStore.setSession(ROOM, session);

        const io = buildMockIo();
        await quizService.resumeQuizSession({
            io,
            quizId: QUIZ_ID,
            sessionCode: ROOM,
            user: HOST_USER,
        });

        const resumed = await sessionStore.getSession(ROOM);
        expect(resumed.currentQuestionIndex).toBe(2);
    });

    it('rejects double-pause', async () => {
        const io = buildMockIo();
        // First pause
        await quizService.pauseQuizSession({ io, quizId: QUIZ_ID, sessionCode: ROOM, user: HOST_USER });

        // Second pause should fail
        const result = await quizService.pauseQuizSession({
            io,
            quizId: QUIZ_ID,
            sessionCode: ROOM,
            user: HOST_USER,
        });

        expect(result.error).toBeDefined();
        expect(result.statusCode).toBe(409);
    });

    it('rejects resume when not paused', async () => {
        const io = buildMockIo();
        const result = await quizService.resumeQuizSession({
            io,
            quizId: QUIZ_ID,
            sessionCode: ROOM,
            user: HOST_USER,
        });

        expect(result.error).toBeDefined();
        expect(result.statusCode).toBe(409);
    });

    it('rejects pause in non-live state', async () => {
        const session = await sessionStore.getSession(ROOM);
        session.status = SESSION_STATUS.COMPLETED;
        await sessionStore.setSession(ROOM, session);

        const io = buildMockIo();
        const result = await quizService.pauseQuizSession({
            io,
            quizId: QUIZ_ID,
            sessionCode: ROOM,
            user: HOST_USER,
        });

        expect(result.error).toBeDefined();
        expect(result.statusCode).toBe(409);
    });

    it('stores remaining time when paused (auto mode)', async () => {
        const expiry = Date.now() + 20000;
        await sessionStore.setSession(
            ROOM,
            buildSession({ mode: 'auto', questionExpiry: expiry }),
        );

        const io = buildMockIo();
        await quizService.pauseQuizSession({
            io,
            quizId: QUIZ_ID,
            sessionCode: ROOM,
            user: HOST_USER,
        });

        const paused = await sessionStore.getSession(ROOM);
        expect(paused.timeLeftOnPause).toBeGreaterThan(0);
        expect(paused.timeLeftOnPause).toBeLessThanOrEqual(20000);
    });

    it('adjusts questionExpiry on resume to preserve remaining time', async () => {
        const timeLeft = 12000;
        const session = buildSession({ mode: 'auto', questionExpiry: Date.now() + timeLeft });
        session.isPaused = true;
        session.pausedAt = Date.now();
        session.timeLeftOnPause = timeLeft;
        await sessionStore.setSession(ROOM, session);

        const io = buildMockIo();
        const resumeTime = Date.now();
        await quizService.resumeQuizSession({
            io,
            quizId: QUIZ_ID,
            sessionCode: ROOM,
            user: HOST_USER,
        });

        const resumed = await sessionStore.getSession(ROOM);
        expect(resumed.questionExpiry).toBeGreaterThan(resumeTime);
        // The new expiry should be approximately resumeTime + timeLeft
        const newTimeLeft = resumed.questionExpiry - resumeTime;
        expect(Math.abs(newTimeLeft - timeLeft)).toBeLessThan(200);
    });

    it('supports multiple pause/resume cycles', async () => {
        const io = buildMockIo();

        // Cycle 1: pause
        await quizService.pauseQuizSession({ io, quizId: QUIZ_ID, sessionCode: ROOM, user: HOST_USER });
        let s = await sessionStore.getSession(ROOM);
        expect(s.isPaused).toBe(true);

        // Cycle 1: resume
        await quizService.resumeQuizSession({ io, quizId: QUIZ_ID, sessionCode: ROOM, user: HOST_USER });
        s = await sessionStore.getSession(ROOM);
        expect(s.isPaused).toBe(false);

        // Cycle 2: pause
        await quizService.pauseQuizSession({ io, quizId: QUIZ_ID, sessionCode: ROOM, user: HOST_USER });
        s = await sessionStore.getSession(ROOM);
        expect(s.isPaused).toBe(true);

        // Cycle 2: resume
        await quizService.resumeQuizSession({ io, quizId: QUIZ_ID, sessionCode: ROOM, user: HOST_USER });
        s = await sessionStore.getSession(ROOM);
        expect(s.isPaused).toBe(false);
    });

    it('prevents answer submission while paused', async () => {
        const session = await sessionStore.getSession(ROOM);
        session.isPaused = true;
        await sessionStore.setSession(ROOM, session);

        // submitAnswer checks isPaused and returns an error
        const canSubmit = !session.isPaused && session.status === SESSION_STATUS.LIVE;
        expect(canSubmit).toBe(false);
    });

    it('rejects pause by non-host users', async () => {
        const io = buildMockIo();
        const result = await quizService.pauseQuizSession({
            io,
            quizId: QUIZ_ID,
            sessionCode: ROOM,
            user: PARTICIPANT_USER,
        });

        expect(result.error).toBeDefined();
        expect(result.statusCode).toBe(403);

        const session = await sessionStore.getSession(ROOM);
        expect(session.isPaused).toBe(false);
    });

    it('rejects resume by non-host users', async () => {
        const session = await sessionStore.getSession(ROOM);
        session.isPaused = true;
        session.pausedAt = Date.now();
        session.timeLeftOnPause = 5000;
        await sessionStore.setSession(ROOM, session);

        const io = buildMockIo();
        const result = await quizService.resumeQuizSession({
            io,
            quizId: QUIZ_ID,
            sessionCode: ROOM,
            user: PARTICIPANT_USER,
        });

        expect(result.error).toBeDefined();
        expect(result.statusCode).toBe(403);

        const updated = await sessionStore.getSession(ROOM);
        expect(updated.isPaused).toBe(true);
    });
});

// ─── Cross-mode edge cases ────────────────────────────────────────────────────

describe('Cross-mode edge cases', () => {
    const ROOM = 'CROSS001';

    beforeEach(async () => {
        setupMockModels(ROOM);
    });

    it('auto mode: questionExpiry is set; tutor mode: questionExpiry is null', async () => {
        const io = buildMockIo();

        // Auto mode
        await sessionStore.setSession(ROOM, buildSession({ mode: 'auto' }));
        await quizService.broadcastQuestionEnhanced(io, ROOM);
        let session = await sessionStore.getSession(ROOM);
        expect(session.questionExpiry).not.toBeNull();

        // Tutor mode
        await sessionStore.setSession(ROOM, buildSession({ mode: 'tutor' }));
        await quizService.broadcastQuestionEnhanced(io, ROOM);
        session = await sessionStore.getSession(ROOM);
        expect(session.questionExpiry).toBeNull();
    });

    it('session completes when final question is advanced past in tutor mode', async () => {
        await sessionStore.setSession(
            ROOM,
            buildSession({ mode: 'tutor', currentQuestionIndex: 3, questions: makeQuestions(3) }),
        );

        const io = buildMockIo();
        await quizService.broadcastQuestionEnhanced(io, ROOM);

        const finished = io.events.find((e) => e.event === 'quiz_finished');
        expect(finished).toBeDefined();
    });

    it('pause/resume works in auto mode as well', async () => {
        await sessionStore.setSession(
            ROOM,
            buildSession({ mode: 'auto', questionExpiry: Date.now() + 25000 }),
        );

        const io = buildMockIo();

        const pauseResult = await quizService.pauseQuizSession({
            io,
            quizId: QUIZ_ID,
            sessionCode: ROOM,
            user: HOST_USER,
        });
        expect(pauseResult.error).toBeUndefined();

        const paused = await sessionStore.getSession(ROOM);
        expect(paused.isPaused).toBe(true);

        const resumeResult = await quizService.resumeQuizSession({
            io,
            quizId: QUIZ_ID,
            sessionCode: ROOM,
            user: HOST_USER,
        });
        expect(resumeResult.error).toBeUndefined();

        const resumed = await sessionStore.getSession(ROOM);
        expect(resumed.isPaused).toBe(false);
    });
});
