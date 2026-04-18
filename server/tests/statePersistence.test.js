const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const QuizSession = require('../models/QuizSession');
const Quiz = require('../models/Quiz');
const Submission = require('../models/Submission');
const {
    executeWithRetry,
    executeInTransaction,
    persistSessionStateTransition,
    persistQuizStateTransition,
    persistSubmission,
    calculateBackoffDelay,
    getQueueSize,
    processFailedOperationsQueue
} = require('../services/session/statePersistence');
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
});

afterEach(async () => {
    await QuizSession.deleteMany({});
    await Quiz.deleteMany({});
    await Submission.deleteMany({});
});

describe('State Persistence Service', () => {
    describe('executeWithRetry', () => {
        it('should succeed on first attempt', async () => {
            const operation = jest.fn().mockResolvedValue('success');
            const result = await executeWithRetry(operation, { test: 'context' });

            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(1);
        });

        it('should retry on failure and eventually succeed', async () => {
            let attempts = 0;
            const operation = jest.fn().mockImplementation(() => {
                attempts++;
                if (attempts < 3) {
                    throw new Error('Temporary failure');
                }
                return Promise.resolve('success');
            });

            const result = await executeWithRetry(operation, { test: 'context' }, 3);

            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(3);
        });

        it('should throw after max retries', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

            await expect(
                executeWithRetry(operation, { test: 'context' }, 3)
            ).rejects.toThrow('Persistent failure');

            expect(operation).toHaveBeenCalledTimes(3);
            expect(getQueueSize()).toBeGreaterThan(0);
        });

        it('should not retry validation errors', async () => {
            const validationError = new Error('Validation failed');
            validationError.name = 'ValidationError';
            const operation = jest.fn().mockRejectedValue(validationError);

            await expect(
                executeWithRetry(operation, { test: 'context' }, 3)
            ).rejects.toThrow('Validation failed');

            expect(operation).toHaveBeenCalledTimes(1);
        });
    });

    describe('calculateBackoffDelay', () => {
        it('should calculate exponential backoff', () => {
            expect(calculateBackoffDelay(1)).toBeGreaterThanOrEqual(100);
            expect(calculateBackoffDelay(1)).toBeLessThan(200);
            
            expect(calculateBackoffDelay(2)).toBeGreaterThanOrEqual(200);
            expect(calculateBackoffDelay(2)).toBeLessThan(300);
            
            expect(calculateBackoffDelay(3)).toBeGreaterThanOrEqual(400);
            expect(calculateBackoffDelay(3)).toBeLessThan(600);
        });

        it('should cap at max delay', () => {
            const delay = calculateBackoffDelay(10);
            expect(delay).toBeLessThanOrEqual(6500); // 5000 + 30% jitter
        });
    });

    describe('executeInTransaction', () => {
        it('should commit transaction on success', async () => {
            const quiz = await Quiz.create({
                title: 'Test Quiz',
                hostId: new mongoose.Types.ObjectId(),
                questions: [],
                status: SESSION_STATUS.DRAFT
            });

            const result = await executeInTransaction(async (session) => {
                await Quiz.findByIdAndUpdate(
                    quiz._id,
                    { status: SESSION_STATUS.WAITING },
                    { session }
                );
                return { updated: true };
            }, { test: 'context' });

            expect(result.updated).toBe(true);

            const updatedQuiz = await Quiz.findById(quiz._id);
            expect(updatedQuiz.status).toBe(SESSION_STATUS.WAITING);
        });

        it('should rollback transaction on failure', async () => {
            const quiz = await Quiz.create({
                title: 'Test Quiz',
                hostId: new mongoose.Types.ObjectId(),
                questions: [],
                status: SESSION_STATUS.DRAFT
            });

            await expect(
                executeInTransaction(async (session) => {
                    await Quiz.findByIdAndUpdate(
                        quiz._id,
                        { status: SESSION_STATUS.WAITING },
                        { session }
                    );
                    throw new Error('Simulated failure');
                }, { test: 'context' })
            ).rejects.toThrow('Simulated failure');

            const unchangedQuiz = await Quiz.findById(quiz._id);
            expect(unchangedQuiz.status).toBe(SESSION_STATUS.DRAFT);
        });
    });

    describe('persistSessionStateTransition', () => {
        it('should persist session state transition', async () => {
            const session = await QuizSession.create({
                quizId: new mongoose.Types.ObjectId(),
                sessionCode: 'TEST123',
                status: SESSION_STATUS.WAITING
            });

            const result = await persistSessionStateTransition(
                'TEST123',
                SESSION_STATUS.LIVE,
                { currentQuestionIndex: 0 }
            );

            expect(result.status).toBe(SESSION_STATUS.LIVE);
            expect(result.currentQuestionIndex).toBe(0);
        });

        it('should throw if session not found', async () => {
            await expect(
                persistSessionStateTransition('NOTFOUND', SESSION_STATUS.LIVE)
            ).rejects.toThrow('Session not found');
        });
    });

    describe('persistQuizStateTransition', () => {
        it('should persist quiz state transition', async () => {
            const quiz = await Quiz.create({
                title: 'Test Quiz',
                hostId: new mongoose.Types.ObjectId(),
                questions: [],
                status: SESSION_STATUS.DRAFT
            });

            const result = await persistQuizStateTransition(
                quiz._id,
                SESSION_STATUS.WAITING,
                { lastSessionCode: 'TEST123' }
            );

            expect(result.status).toBe(SESSION_STATUS.WAITING);
            expect(result.lastSessionCode).toBe('TEST123');
        });
    });

    describe('persistSubmission', () => {
        it('should persist submission with retry', async () => {
            const submissionData = {
                userId: new mongoose.Types.ObjectId(),
                quizId: new mongoose.Types.ObjectId(),
                roomCode: 'TEST123',
                questionId: new mongoose.Types.ObjectId(),
                selectedOption: 'A',
                timeTaken: 5,
                score: 100,
                isCorrect: true
            };

            const result = await persistSubmission(submissionData);

            expect(result.userId.toString()).toBe(submissionData.userId.toString());
            expect(result.score).toBe(100);
            expect(result.isCorrect).toBe(true);

            const saved = await Submission.findById(result._id);
            expect(saved).toBeDefined();
        });
    });

    describe('processFailedOperationsQueue', () => {
        it('should process queued operations', async () => {
            // Force an operation to fail and get queued
            const operation = jest.fn().mockRejectedValue(new Error('Failure'));

            try {
                await executeWithRetry(operation, { test: 'context' }, 2);
            } catch (error) {
                // Expected to fail
            }

            const initialQueueSize = getQueueSize();
            expect(initialQueueSize).toBeGreaterThan(0);

            // Mock the operation to succeed on retry
            operation.mockResolvedValue('success');

            const stats = await processFailedOperationsQueue();

            expect(stats.processed).toBe(initialQueueSize);
        });
    });
});
