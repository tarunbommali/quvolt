/**
 * Session Access Override Tests
 * Tests for Task 15.2: Add session-specific access overrides
 * Requirements: 10.3, 10.5
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Quiz = require('../models/Quiz');
const QuizSession = require('../models/QuizSession');
const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const jwt = require('jsonwebtoken');

describe('Session Access Override Tests (Task 15.2)', () => {
    let hostUser, participantUser, adminUser;
    let hostToken, participantToken, adminToken;
    let quiz;

    beforeAll(async () => {
        // Create permissions
        const createQuizPerm = await Permission.create({
            name: 'create_quiz',
            description: 'Create quizzes',
            resource: 'quiz',
            action: 'create',
        });
        const joinQuizPerm = await Permission.create({
            name: 'join_quiz',
            description: 'Join quiz sessions',
            resource: 'quiz',
            action: 'join',
        });

        // Create roles
        const hostRole = await Role.create({
            name: 'host',
            permissions: [createQuizPerm._id, joinQuizPerm._id],
        });
        const participantRole = await Role.create({
            name: 'participant',
            permissions: [joinQuizPerm._id],
        });
        const adminRole = await Role.create({
            name: 'admin',
            permissions: [createQuizPerm._id, joinQuizPerm._id],
        });

        // Create users
        hostUser = await User.create({
            name: 'Host User',
            email: 'host@test.com',
            password: 'password123',
            role: 'host',
            roles: [hostRole._id],
        });

        participantUser = await User.create({
            name: 'Participant User',
            email: 'participant@test.com',
            password: 'password123',
            role: 'participant',
            roles: [participantRole._id],
        });

        adminUser = await User.create({
            name: 'Admin User',
            email: 'admin@test.com',
            password: 'password123',
            role: 'admin',
            roles: [adminRole._id],
        });

        // Generate tokens
        hostToken = jwt.sign({ id: hostUser._id }, process.env.JWT_SECRET || 'test-secret');
        participantToken = jwt.sign({ id: participantUser._id }, process.env.JWT_SECRET || 'test-secret');
        adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET || 'test-secret');
    });

    beforeEach(async () => {
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
    });

    afterAll(async () => {
        await User.deleteMany({});
        await Role.deleteMany({});
        await Permission.deleteMany({});
        await mongoose.connection.close();
    });

    describe('Session Creation with Access Overrides', () => {
        it('should create session with default inherit access type', async () => {
            const response = await request(app)
                .post(`/api/quiz/${quiz._id}/start`)
                .set('Authorization', `Bearer ${hostToken}`)
                .send({});

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const session = await QuizSession.findOne({ quizId: quiz._id });
            expect(session).toBeTruthy();
            expect(session.accessType).toBe('inherit'); // Default value
        });

        it('should create session with public access override', async () => {
            const response = await request(app)
                .post(`/api/quiz/${quiz._id}/start`)
                .set('Authorization', `Bearer ${hostToken}`)
                .send({
                    accessType: 'public',
                });

            expect(response.status).toBe(200);

            const session = await QuizSession.findOne({ quizId: quiz._id });
            expect(session.accessType).toBe('public');
        });

        it('should create session with private access override and allowed emails', async () => {
            const response = await request(app)
                .post(`/api/quiz/${quiz._id}/start`)
                .set('Authorization', `Bearer ${hostToken}`)
                .send({
                    accessType: 'private',
                    allowedEmails: ['allowed@test.com', 'another@test.com'],
                });

            expect(response.status).toBe(200);

            const session = await QuizSession.findOne({ quizId: quiz._id });
            expect(session.accessType).toBe('private');
            expect(session.allowedEmails).toEqual(['allowed@test.com', 'another@test.com']);
        });

        it('should create session with shared access override and sharedWith users', async () => {
            const response = await request(app)
                .post(`/api/quiz/${quiz._id}/start`)
                .set('Authorization', `Bearer ${hostToken}`)
                .send({
                    accessType: 'shared',
                    sharedWith: [participantUser._id.toString()],
                });

            expect(response.status).toBe(200);

            const session = await QuizSession.findOne({ quizId: quiz._id });
            expect(session.accessType).toBe('shared');
            expect(session.sharedWith).toHaveLength(1);
            expect(session.sharedWith[0].toString()).toBe(participantUser._id.toString());
        });

        it('should reject invalid access type', async () => {
            const response = await request(app)
                .post(`/api/quiz/${quiz._id}/start`)
                .set('Authorization', `Bearer ${hostToken}`)
                .send({
                    accessType: 'invalid',
                });

            expect(response.status).toBe(400);
        });

        it('should reject invalid email format in allowedEmails', async () => {
            const response = await request(app)
                .post(`/api/quiz/${quiz._id}/start`)
                .set('Authorization', `Bearer ${hostToken}`)
                .send({
                    accessType: 'private',
                    allowedEmails: ['invalid-email'],
                });

            expect(response.status).toBe(400);
        });
    });

    describe('Scheduled Session Creation with Access Overrides', () => {
        it('should schedule session with access override', async () => {
            const futureDate = new Date(Date.now() + 3600000); // 1 hour from now

            const response = await request(app)
                .post(`/api/quiz/${quiz._id}/schedule`)
                .set('Authorization', `Bearer ${hostToken}`)
                .send({
                    scheduledAt: futureDate.toISOString(),
                    accessType: 'private',
                    allowedEmails: ['invited@test.com'],
                });

            expect(response.status).toBe(200);

            const session = await QuizSession.findOne({ quizId: quiz._id });
            expect(session.accessType).toBe('private');
            expect(session.allowedEmails).toContain('invited@test.com');
        });
    });

    describe('Update Session Access Policy', () => {
        let session;

        beforeEach(async () => {
            // Create a session first
            session = await QuizSession.create({
                templateId: quiz._id,
                quizId: quiz._id,
                sessionCode: 'TEST123',
                status: 'waiting',
                mode: 'auto',
                accessType: 'inherit',
            });
        });

        it('should update session access policy to private', async () => {
            const response = await request(app)
                .put(`/api/quiz/session/${session.sessionCode}/access`)
                .set('Authorization', `Bearer ${hostToken}`)
                .send({
                    accessType: 'private',
                    allowedEmails: ['newuser@test.com'],
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.accessType).toBe('private');
            expect(response.body.data.allowedEmails).toContain('newuser@test.com');

            const updatedSession = await QuizSession.findById(session._id);
            expect(updatedSession.accessType).toBe('private');
            expect(updatedSession.allowedEmails).toContain('newuser@test.com');
        });

        it('should update session access policy to shared', async () => {
            const response = await request(app)
                .put(`/api/quiz/session/${session.sessionCode}/access`)
                .set('Authorization', `Bearer ${hostToken}`)
                .send({
                    accessType: 'shared',
                    sharedWith: [participantUser._id.toString()],
                });

            expect(response.status).toBe(200);
            expect(response.body.data.accessType).toBe('shared');

            const updatedSession = await QuizSession.findById(session._id);
            expect(updatedSession.accessType).toBe('shared');
            expect(updatedSession.sharedWith).toHaveLength(1);
        });

        it('should allow admin to update session access policy', async () => {
            const response = await request(app)
                .put(`/api/quiz/session/${session.sessionCode}/access`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    accessType: 'public',
                });

            expect(response.status).toBe(200);
        });

        it('should reject non-owner participant from updating session access', async () => {
            const response = await request(app)
                .put(`/api/quiz/session/${session.sessionCode}/access`)
                .set('Authorization', `Bearer ${participantToken}`)
                .send({
                    accessType: 'public',
                });

            expect(response.status).toBe(403);
        });

        it('should reject invalid session code', async () => {
            const response = await request(app)
                .put('/api/quiz/session/INVALID/access')
                .set('Authorization', `Bearer ${hostToken}`)
                .send({
                    accessType: 'public',
                });

            expect(response.status).toBe(404);
        });

        it('should update session back to inherit', async () => {
            // First set to private
            await request(app)
                .put(`/api/quiz/session/${session.sessionCode}/access`)
                .set('Authorization', `Bearer ${hostToken}`)
                .send({
                    accessType: 'private',
                    allowedEmails: ['test@test.com'],
                });

            // Then set back to inherit
            const response = await request(app)
                .put(`/api/quiz/session/${session.sessionCode}/access`)
                .set('Authorization', `Bearer ${hostToken}`)
                .send({
                    accessType: 'inherit',
                });

            expect(response.status).toBe(200);
            expect(response.body.data.accessType).toBe('inherit');

            const updatedSession = await QuizSession.findById(session._id);
            expect(updatedSession.accessType).toBe('inherit');
        });
    });

    describe('Session Access Control with Overrides', () => {
        it('should inherit public access from quiz when session uses inherit', async () => {
            const session = await QuizSession.create({
                templateId: quiz._id,
                quizId: quiz._id,
                sessionCode: 'INHERIT1',
                status: 'waiting',
                mode: 'auto',
                accessType: 'inherit',
            });

            const sessionAccessControl = require('../services/session/sessionAccessControl');
            const result = await sessionAccessControl.canJoinSession(
                participantUser,
                quiz,
                session
            );

            expect(result.allowed).toBe(true);
        });

        it('should override quiz access when session has private access', async () => {
            // Quiz is public, but session is private
            const session = await QuizSession.create({
                templateId: quiz._id,
                quizId: quiz._id,
                sessionCode: 'PRIVATE1',
                status: 'waiting',
                mode: 'auto',
                accessType: 'private',
                allowedEmails: ['allowed@test.com'],
            });

            const sessionAccessControl = require('../services/session/sessionAccessControl');
            
            // Participant not in allowed list should be denied
            const result = await sessionAccessControl.canJoinSession(
                participantUser,
                quiz,
                session
            );

            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('private');
        });

        it('should allow access when user is in session sharedWith list', async () => {
            const session = await QuizSession.create({
                templateId: quiz._id,
                quizId: quiz._id,
                sessionCode: 'SHARED1',
                status: 'waiting',
                mode: 'auto',
                accessType: 'shared',
                sharedWith: [participantUser._id],
            });

            const sessionAccessControl = require('../services/session/sessionAccessControl');
            const result = await sessionAccessControl.canJoinSession(
                participantUser,
                quiz,
                session
            );

            expect(result.allowed).toBe(true);
        });
    });
});
