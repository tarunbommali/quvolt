/**
 * Session Access Override Unit Tests
 * Tests for Task 15.2: Add session-specific access overrides
 * Requirements: 10.3, 10.5
 */

const mongoose = require('mongoose');
const QuizSession = require('../models/QuizSession');
const Quiz = require('../models/Quiz');
const User = require('../models/User');

describe('Session Access Override Unit Tests (Task 15.2)', () => {
    let hostUser, quiz;

    beforeAll(async () => {
        // Connect to test database
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/quiz-test', {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
        }
    });

    beforeEach(async () => {
        // Create a test user
        hostUser = await User.create({
            name: 'Host User',
            email: 'host@test.com',
            password: 'password123',
            role: 'host',
        });

        // Create a test quiz
        quiz = await Quiz.create({
            title: 'Test Quiz',
            hostId: hostUser._id,
            accessType: 'public',
            questions: [
                {
                    text: 'What is 2+2?',
                    options: ['3', '4', '5', '6'],
                    correctOption: 1,
                    hashedCorrectAnswer: 'hashed',
                    timeLimit: 30,
                },
            ],
        });
    });

    afterEach(async () => {
        await Quiz.deleteMany({});
        await QuizSession.deleteMany({});
        await User.deleteMany({});
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe('QuizSession Model - Access Override Fields', () => {
        it('should create session with default inherit access type', async () => {
            const session = await QuizSession.create({
                templateId: quiz._id,
                quizId: quiz._id,
                sessionCode: 'TEST001',
                status: 'waiting',
                mode: 'auto',
            });

            expect(session.accessType).toBe('inherit');
            expect(session.allowedEmails).toEqual([]);
            expect(session.sharedWith).toEqual([]);
        });

        it('should create session with public access override', async () => {
            const session = await QuizSession.create({
                templateId: quiz._id,
                quizId: quiz._id,
                sessionCode: 'TEST002',
                status: 'waiting',
                mode: 'auto',
                accessType: 'public',
            });

            expect(session.accessType).toBe('public');
        });

        it('should create session with private access and allowed emails', async () => {
            const session = await QuizSession.create({
                templateId: quiz._id,
                quizId: quiz._id,
                sessionCode: 'TEST003',
                status: 'waiting',
                mode: 'auto',
                accessType: 'private',
                allowedEmails: ['user1@test.com', 'user2@test.com'],
            });

            expect(session.accessType).toBe('private');
            expect(session.allowedEmails).toHaveLength(2);
            expect(session.allowedEmails).toContain('user1@test.com');
            expect(session.allowedEmails).toContain('user2@test.com');
        });

        it('should create session with shared access and sharedWith users', async () => {
            const user1 = await User.create({
                name: 'User 1',
                email: 'user1@test.com',
                password: 'password123',
                role: 'participant',
            });

            const session = await QuizSession.create({
                templateId: quiz._id,
                quizId: quiz._id,
                sessionCode: 'TEST004',
                status: 'waiting',
                mode: 'auto',
                accessType: 'shared',
                sharedWith: [user1._id],
            });

            expect(session.accessType).toBe('shared');
            expect(session.sharedWith).toHaveLength(1);
            expect(session.sharedWith[0].toString()).toBe(user1._id.toString());
        });

        it('should update session access policy', async () => {
            const session = await QuizSession.create({
                templateId: quiz._id,
                quizId: quiz._id,
                sessionCode: 'TEST005',
                status: 'waiting',
                mode: 'auto',
                accessType: 'inherit',
            });

            // Update to private
            session.accessType = 'private';
            session.allowedEmails = ['newuser@test.com'];
            await session.save();

            const updated = await QuizSession.findById(session._id);
            expect(updated.accessType).toBe('private');
            expect(updated.allowedEmails).toContain('newuser@test.com');
        });

        it('should allow all valid access types', async () => {
            const validTypes = ['inherit', 'public', 'private', 'shared'];

            for (const accessType of validTypes) {
                const session = await QuizSession.create({
                    templateId: quiz._id,
                    quizId: quiz._id,
                    sessionCode: `TEST${accessType.toUpperCase()}`,
                    status: 'waiting',
                    mode: 'auto',
                    accessType,
                });

                expect(session.accessType).toBe(accessType);
            }
        });

        it('should reject invalid access type', async () => {
            await expect(
                QuizSession.create({
                    templateId: quiz._id,
                    quizId: quiz._id,
                    sessionCode: 'TESTINVALID',
                    status: 'waiting',
                    mode: 'auto',
                    accessType: 'invalid',
                })
            ).rejects.toThrow();
        });
    });

    describe('Session Access Control Service Integration', () => {
        it('should inherit quiz access when session uses inherit', async () => {
            const sessionAccessControl = require('../services/session/sessionAccessControl');

            const session = await QuizSession.create({
                templateId: quiz._id,
                quizId: quiz._id,
                sessionCode: 'INHERIT1',
                status: 'waiting',
                mode: 'auto',
                accessType: 'inherit',
            });

            const participant = await User.create({
                name: 'Participant',
                email: 'participant@test.com',
                password: 'password123',
                role: 'participant',
            });

            // Mock RBAC service to return true for join_quiz permission
            const rbacService = require('../services/rbac/rbac.service');
            jest.spyOn(rbacService, 'checkPermission').mockResolvedValue(true);

            const result = await sessionAccessControl.canJoinSession(
                participant,
                quiz,
                session
            );

            expect(result.allowed).toBe(true);

            rbacService.checkPermission.mockRestore();
        });

        it('should override quiz access when session has private access', async () => {
            const sessionAccessControl = require('../services/session/sessionAccessControl');

            // Quiz is public
            const session = await QuizSession.create({
                templateId: quiz._id,
                quizId: quiz._id,
                sessionCode: 'PRIVATE1',
                status: 'waiting',
                mode: 'auto',
                accessType: 'private',
                allowedEmails: ['allowed@test.com'],
            });

            const participant = await User.create({
                name: 'Participant',
                email: 'notallowed@test.com',
                password: 'password123',
                role: 'participant',
            });

            // Mock RBAC service
            const rbacService = require('../services/rbac/rbac.service');
            jest.spyOn(rbacService, 'checkPermission').mockResolvedValue(true);

            const result = await sessionAccessControl.canJoinSession(
                participant,
                quiz,
                session
            );

            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('private');

            rbacService.checkPermission.mockRestore();
        });

        it('should allow access when user is in session sharedWith list', async () => {
            const sessionAccessControl = require('../services/session/sessionAccessControl');

            const participant = await User.create({
                name: 'Participant',
                email: 'participant@test.com',
                password: 'password123',
                role: 'participant',
            });

            const session = await QuizSession.create({
                templateId: quiz._id,
                quizId: quiz._id,
                sessionCode: 'SHARED1',
                status: 'waiting',
                mode: 'auto',
                accessType: 'shared',
                sharedWith: [participant._id],
            });

            // Mock RBAC service
            const rbacService = require('../services/rbac/rbac.service');
            jest.spyOn(rbacService, 'checkPermission').mockResolvedValue(true);

            const result = await sessionAccessControl.canJoinSession(
                participant,
                quiz,
                session
            );

            expect(result.allowed).toBe(true);

            rbacService.checkPermission.mockRestore();
        });
    });
});
