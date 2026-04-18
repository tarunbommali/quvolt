const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const QuizSession = require('../models/QuizSession');
const Quiz = require('../models/Quiz');
const Submission = require('../models/Submission');
const User = require('../models/User');
const sessionStore = require('../services/session/session.service');
const {
    restoreActiveSessions,
    loadParticipantData,
    loadLeaderboardData,
    handleParticipantReconnection
} = require('../services/session/sessionRecovery');
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
    await User.deleteMany({});
});

describe('Session Recovery Service', () => {
    describe('restoreActiveSessions', () => {
        it('should restore active sessions from database to Redis', async () => {
            // Create a test quiz
            const quiz = await Quiz.create({
                title: 'Test Quiz',
                hostId: new mongoose.Types.ObjectId(),
                questions: [
                    {
                        text: 'Question 1',
                        options: ['A', 'B', 'C', 'D'],
                        correctOption: 0,
                        hashedCorrectAnswer: 'hash1',
                        timeLimit: 30
                    }
                ],
                mode: 'auto',
                status: SESSION_STATUS.LIVE
            });

            // Create an active session
            const session = await QuizSession.create({
                quizId: quiz._id,
                sessionCode: 'TEST123',
                status: SESSION_STATUS.LIVE,
                mode: 'auto',
                currentQuestionIndex: 0,
                templateSnapshot: {
                    questions: quiz.questions
                }
            });

            // Mock io
            const mockIo = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn()
            };

            // Restore sessions
            const stats = await restoreActiveSessions(mockIo);

            expect(stats.total).toBe(1);
            expect(stats.restored).toBe(1);
            expect(stats.aborted).toBe(0);

            // Verify session was restored to Redis
            const restoredSession = await sessionStore.getSession('TEST123');
            expect(restoredSession).toBeDefined();
            expect(restoredSession.status).toBe(SESSION_STATUS.LIVE);
            expect(restoredSession.currentQuestionIndex).toBe(0);
        });

        it('should abort sessions that cannot be restored', async () => {
            // Create a session without questions
            const session = await QuizSession.create({
                quizId: new mongoose.Types.ObjectId(),
                sessionCode: 'INVALID',
                status: SESSION_STATUS.LIVE,
                mode: 'auto'
            });

            const mockIo = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn()
            };

            const stats = await restoreActiveSessions(mockIo);

            expect(stats.total).toBe(1);
            expect(stats.restored).toBe(0);
            expect(stats.aborted).toBe(1);

            // Verify session was aborted
            const abortedSession = await QuizSession.findById(session._id);
            expect(abortedSession.status).toBe(SESSION_STATUS.ABORTED);
        });
    });

    describe('loadParticipantData', () => {
        it('should load participants from submissions', async () => {
            const sessionId = new mongoose.Types.ObjectId();
            const sessionCode = 'TEST123';

            // Create test users
            const user1 = await User.create({
                name: 'User 1',
                email: 'user1@test.com',
                password: 'password',
                role: 'participant'
            });

            const user2 = await User.create({
                name: 'User 2',
                email: 'user2@test.com',
                password: 'password',
                role: 'participant'
            });

            // Create submissions
            await Submission.create({
                userId: user1._id,
                quizId: new mongoose.Types.ObjectId(),
                sessionId,
                roomCode: sessionCode,
                questionId: new mongoose.Types.ObjectId(),
                selectedOption: 'A',
                timeTaken: 5,
                score: 100,
                isCorrect: true
            });

            await Submission.create({
                userId: user2._id,
                quizId: new mongoose.Types.ObjectId(),
                sessionId,
                roomCode: sessionCode,
                questionId: new mongoose.Types.ObjectId(),
                selectedOption: 'B',
                timeTaken: 10,
                score: 50,
                isCorrect: false
            });

            const participants = await loadParticipantData(sessionId, sessionCode);

            expect(Object.keys(participants).length).toBe(2);
            expect(participants[user1._id.toString()]).toBeDefined();
            expect(participants[user1._id.toString()].name).toBe('User 1');
            expect(participants[user2._id.toString()]).toBeDefined();
            expect(participants[user2._id.toString()].name).toBe('User 2');
        });
    });

    describe('loadLeaderboardData', () => {
        it('should aggregate scores from submissions', async () => {
            const sessionId = new mongoose.Types.ObjectId();
            const sessionCode = 'TEST123';

            const user = await User.create({
                name: 'Test User',
                email: 'test@test.com',
                password: 'password',
                role: 'participant'
            });

            // Create multiple submissions for the same user
            await Submission.create({
                userId: user._id,
                quizId: new mongoose.Types.ObjectId(),
                sessionId,
                roomCode: sessionCode,
                questionId: new mongoose.Types.ObjectId(),
                selectedOption: 'A',
                timeTaken: 5,
                score: 100,
                isCorrect: true
            });

            await Submission.create({
                userId: user._id,
                quizId: new mongoose.Types.ObjectId(),
                sessionId,
                roomCode: sessionCode,
                questionId: new mongoose.Types.ObjectId(),
                selectedOption: 'B',
                timeTaken: 10,
                score: 80,
                isCorrect: true
            });

            const leaderboard = await loadLeaderboardData(sessionId, sessionCode);

            expect(Object.keys(leaderboard).length).toBe(1);
            expect(leaderboard[user._id.toString()]).toBeDefined();
            expect(leaderboard[user._id.toString()].score).toBe(180);
            expect(leaderboard[user._id.toString()].time).toBe(15);
            expect(leaderboard[user._id.toString()].streak).toBe(2);
        });
    });

    describe('handleParticipantReconnection', () => {
        it('should restore participant state on reconnection', async () => {
            const sessionCode = 'TEST123';
            const user = {
                _id: new mongoose.Types.ObjectId().toString(),
                name: 'Test User'
            };

            // Create session in Redis
            const session = {
                status: SESSION_STATUS.LIVE,
                mode: 'auto',
                currentQuestionIndex: 1,
                participants: {
                    [user._id]: { _id: user._id, name: user.name }
                },
                leaderboard: {
                    [user._id]: {
                        userId: user._id,
                        name: user.name,
                        score: 150,
                        time: 20,
                        streak: 2,
                        bestStreak: 2
                    }
                },
                questions: [
                    { _id: 'q1', text: 'Question 1', options: ['A', 'B'], timeLimit: 30 },
                    { _id: 'q2', text: 'Question 2', options: ['C', 'D'], timeLimit: 30 }
                ],
                questionExpiry: Date.now() + 10000,
                lastActivity: Date.now(),
                sessionId: new mongoose.Types.ObjectId().toString()
            };

            await sessionStore.setSession(sessionCode, session);

            const mockSocket = {};
            const result = await handleParticipantReconnection(mockSocket, sessionCode, user);

            expect(result.reconnected).toBe(true);
            expect(result.currentQuestion).toBeDefined();
            expect(result.currentQuestion.text).toBe('Question 2');
            expect(result.userStats.score).toBe(150);
            expect(result.sessionStatus).toBe(SESSION_STATUS.LIVE);
        });

        it('should reject reconnection if window expired', async () => {
            const sessionCode = 'TEST123';
            const user = {
                _id: new mongoose.Types.ObjectId().toString(),
                name: 'Test User'
            };

            // Create session with old lastActivity
            const session = {
                status: SESSION_STATUS.LIVE,
                participants: {
                    [user._id]: { _id: user._id, name: user.name }
                },
                lastActivity: Date.now() - (6 * 60 * 1000) // 6 minutes ago
            };

            await sessionStore.setSession(sessionCode, session);

            const mockSocket = {};
            const result = await handleParticipantReconnection(mockSocket, sessionCode, user);

            expect(result.reconnected).toBe(false);
            expect(result.reason).toBe('reconnection_window_expired');
        });
    });
});
