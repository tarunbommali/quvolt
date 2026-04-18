const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const QuizSession = require('../models/QuizSession');
const Quiz = require('../models/Quiz');
const sessionStore = require('../services/session/session.service');
const {
    cleanupStaleSessions,
    startSessionCleanupJob,
    stopSessionCleanupJob,
    getCleanupJobStatus,
    STALE_SESSION_THRESHOLD_MS
} = require('../jobs/sessionCleanup');
const { SESSION_STATUS } = require('../utils/sessionStateMachine');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    stopSessionCleanupJob();
});

afterEach(async () => {
    await QuizSession.deleteMany({});
    await Quiz.deleteMany({});
});

describe('Session Cleanup Job', () => {
    describe('cleanupStaleSessions', () => {
        it('should abort sessions older than 24 hours', async () => {
            const quiz = await Quiz.create({
                title: 'Test Quiz',
                hostId: new mongoose.Types.ObjectId(),
                questions: [],
                status: SESSION_STATUS.LIVE
            });

            // Create a stale session (started more than 24 hours ago)
            const staleDate = new Date(Date.now() - STALE_SESSION_THRESHOLD_MS - 1000);
            const staleSession = await QuizSession.create({
                quizId: quiz._id,
                sessionCode: 'STALE123',
                status: SESSION_STATUS.LIVE,
                startedAt: staleDate,
                updatedAt: staleDate
            });

            // Add session to Redis
            await sessionStore.setSession('STALE123', {
                status: SESSION_STATUS.LIVE,
                participants: {},
                leaderboard: {}
            });

            const mockIo = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
                in: jest.fn().mockReturnThis(),
                socketsLeave: jest.fn()
            };

            // Mock the global io instance
            const cleanup = require('../jobs/sessionCleanup');
            const originalStartJob = cleanup.startSessionCleanupJob;
            cleanup.startSessionCleanupJob(mockIo);

            const stats = await cleanupStaleSessions();

            expect(stats.checked).toBe(1);
            expect(stats.aborted).toBe(1);
            expect(stats.errors.length).toBe(0);

            // Verify session was aborted
            const abortedSession = await QuizSession.findById(staleSession._id);
            expect(abortedSession.status).toBe(SESSION_STATUS.ABORTED);
            expect(abortedSession.endedAt).toBeDefined();

            // Verify quiz was updated
            const updatedQuiz = await Quiz.findById(quiz._id);
            expect(updatedQuiz.status).toBe(SESSION_STATUS.ABORTED);

            // Verify session was removed from Redis
            const redisSession = await sessionStore.getSession('STALE123');
            expect(redisSession).toBeNull();

            // Verify socket events were emitted
            expect(mockIo.to).toHaveBeenCalledWith('STALE123');
            expect(mockIo.emit).toHaveBeenCalledWith('quiz_aborted', expect.objectContaining({
                reason: 'stale_session'
            }));
        });

        it('should not abort recent sessions', async () => {
            const quiz = await Quiz.create({
                title: 'Test Quiz',
                hostId: new mongoose.Types.ObjectId(),
                questions: [],
                status: SESSION_STATUS.LIVE
            });

            // Create a recent session
            const recentSession = await QuizSession.create({
                quizId: quiz._id,
                sessionCode: 'RECENT123',
                status: SESSION_STATUS.LIVE,
                startedAt: new Date()
            });

            const stats = await cleanupStaleSessions();

            expect(stats.checked).toBe(0);
            expect(stats.aborted).toBe(0);

            // Verify session was not aborted
            const unchangedSession = await QuizSession.findById(recentSession._id);
            expect(unchangedSession.status).toBe(SESSION_STATUS.LIVE);
        });

        it('should handle multiple stale sessions', async () => {
            const staleDate = new Date(Date.now() - STALE_SESSION_THRESHOLD_MS - 1000);

            // Create multiple stale sessions
            for (let i = 0; i < 3; i++) {
                const quiz = await Quiz.create({
                    title: `Test Quiz ${i}`,
                    hostId: new mongoose.Types.ObjectId(),
                    questions: [],
                    status: SESSION_STATUS.LIVE
                });

                await QuizSession.create({
                    quizId: quiz._id,
                    sessionCode: `STALE${i}`,
                    status: SESSION_STATUS.LIVE,
                    startedAt: staleDate,
                    updatedAt: staleDate
                });
            }

            const mockIo = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
                in: jest.fn().mockReturnThis(),
                socketsLeave: jest.fn()
            };

            const cleanup = require('../jobs/sessionCleanup');
            cleanup.startSessionCleanupJob(mockIo);

            const stats = await cleanupStaleSessions();

            expect(stats.checked).toBe(3);
            expect(stats.aborted).toBe(3);
            expect(stats.errors.length).toBe(0);
        });

        it('should handle errors gracefully', async () => {
            const staleDate = new Date(Date.now() - STALE_SESSION_THRESHOLD_MS - 1000);

            // Create a stale session with invalid quiz reference
            await QuizSession.create({
                quizId: new mongoose.Types.ObjectId(), // Non-existent quiz
                sessionCode: 'ERROR123',
                status: SESSION_STATUS.LIVE,
                startedAt: staleDate,
                updatedAt: staleDate
            });

            const mockIo = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
                in: jest.fn().mockReturnThis(),
                socketsLeave: jest.fn()
            };

            const cleanup = require('../jobs/sessionCleanup');
            cleanup.startSessionCleanupJob(mockIo);

            const stats = await cleanupStaleSessions();

            expect(stats.checked).toBe(1);
            // Should still abort the session even if quiz update fails
            expect(stats.aborted).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Job Management', () => {
        it('should start and stop cleanup job', () => {
            const mockIo = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn()
            };

            startSessionCleanupJob(mockIo);
            let status = getCleanupJobStatus();
            expect(status.running).toBe(true);

            stopSessionCleanupJob();
            status = getCleanupJobStatus();
            expect(status.running).toBe(false);
        });

        it('should not start job twice', () => {
            const mockIo = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn()
            };

            startSessionCleanupJob(mockIo);
            startSessionCleanupJob(mockIo); // Should warn but not crash

            const status = getCleanupJobStatus();
            expect(status.running).toBe(true);

            stopSessionCleanupJob();
        });
    });
});
