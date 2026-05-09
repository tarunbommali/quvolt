/**
 * Integration tests for Resource-Level Access Control (Task 14.4)
 * Tests Requirements: 8.3, 8.4, 8.5, 8.6
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Quiz = require('../models/Quiz');
const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const { generateToken } = require('../utils/jwt');

describe('Resource-Level Access Control', () => {
    let hostUser, participantUser, otherUser, adminUser;
    let hostToken, participantToken, otherToken, adminToken;
    let publicQuiz, privateQuiz, sharedQuiz;

    beforeAll(async () => {
        // Create permissions
        const createQuizPerm = await Permission.create({
            name: 'create_quiz',
            description: 'Create quizzes',
        });

        // Create roles
        const hostRole = await Role.create({
            name: 'host',
            permissions: [createQuizPerm._id],
        });

        const participantRole = await Role.create({
            name: 'participant',
            permissions: [],
        });

        const adminRole = await Role.create({
            name: 'admin',
            permissions: [createQuizPerm._id],
        });

        // Create test users
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

        otherUser = await User.create({
            name: 'Other User',
            email: 'other@test.com',
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
        hostToken = generateToken(hostUser._id);
        participantToken = generateToken(participantUser._id);
        otherToken = generateToken(otherUser._id);
        adminToken = generateToken(adminUser._id);

        // Create test quizzes
        publicQuiz = await Quiz.create({
            title: 'Public Quiz',
            hostId: hostUser._id,
            roomCode: 'PUB001',
            accessType: 'public',
            questions: [
                {
                    text: 'What is 2+2?',
                    options: ['3', '4', '5', '6'],
                    correctOption: 1,
                    hashedCorrectAnswer: 'hashed_4',
                    timeLimit: 30,
                },
            ],
        });

        privateQuiz = await Quiz.create({
            title: 'Private Quiz',
            hostId: hostUser._id,
            roomCode: 'PRIV01',
            accessType: 'private',
            allowedEmails: ['participant@test.com'],
            questions: [
                {
                    text: 'What is 3+3?',
                    options: ['5', '6', '7', '8'],
                    correctOption: 1,
                    hashedCorrectAnswer: 'hashed_6',
                    timeLimit: 30,
                },
            ],
        });

        sharedQuiz = await Quiz.create({
            title: 'Shared Quiz',
            hostId: hostUser._id,
            roomCode: 'SHARE1',
            accessType: 'shared',
            sharedWith: [participantUser._id],
            questions: [
                {
                    text: 'What is 4+4?',
                    options: ['6', '7', '8', '9'],
                    correctOption: 2,
                    hashedCorrectAnswer: 'hashed_8',
                    timeLimit: 30,
                },
            ],
        });
    });

    afterAll(async () => {
        await Quiz.deleteMany({});
        await User.deleteMany({});
        await Role.deleteMany({});
        await Permission.deleteMany({});
        await mongoose.connection.close();
    });

    describe('Public Quiz Access (Requirement 8.3)', () => {
        it('should allow any authenticated user to view public quiz', async () => {
            const response = await request(app)
                .get(`/api/quiz/${publicQuiz._id}`)
                .set('Authorization', `Bearer ${participantToken}`);

            expect(response.status).toBe(200);
            expect(response.body.title).toBe('Public Quiz');
            expect(response.body.accessType).toBe('public');
        });

        it('should allow different user to view public quiz', async () => {
            const response = await request(app)
                .get(`/api/quiz/${publicQuiz._id}`)
                .set('Authorization', `Bearer ${otherToken}`);

            expect(response.status).toBe(200);
            expect(response.body.title).toBe('Public Quiz');
        });

        it('should not expose sensitive fields in public quiz', async () => {
            const response = await request(app)
                .get(`/api/quiz/${publicQuiz._id}`)
                .set('Authorization', `Bearer ${participantToken}`);

            expect(response.status).toBe(200);
            // Sensitive fields should not be exposed
            if (response.body.questions && response.body.questions.length > 0) {
                expect(response.body.questions[0].hashedCorrectAnswer).toBeUndefined();
                expect(response.body.questions[0].correctOption).toBeUndefined();
            }
        });
    });

    describe('Private Quiz Access (Requirement 8.4)', () => {
        it('should deny access to private quiz for unauthorized user', async () => {
            const response = await request(app)
                .get(`/api/quiz/${privateQuiz._id}`)
                .set('Authorization', `Bearer ${otherToken}`);

            expect(response.status).toBe(403);
        });

        it('should allow access to private quiz for user in allowedEmails', async () => {
            const response = await request(app)
                .get(`/api/quiz/${privateQuiz._id}`)
                .set('Authorization', `Bearer ${participantToken}`);

            expect(response.status).toBe(200);
            expect(response.body.title).toBe('Private Quiz');
        });

        it('should allow quiz owner to access their private quiz', async () => {
            const response = await request(app)
                .get(`/api/quiz/${privateQuiz._id}`)
                .set('Authorization', `Bearer ${hostToken}`);

            expect(response.status).toBe(200);
            expect(response.body.title).toBe('Private Quiz');
        });

        it('should allow admin to access any private quiz', async () => {
            const response = await request(app)
                .get(`/api/quiz/${privateQuiz._id}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.title).toBe('Private Quiz');
        });
    });

    describe('Shared Quiz Access (Requirement 8.5)', () => {
        it('should allow access to shared quiz for user in sharedWith list', async () => {
            const response = await request(app)
                .get(`/api/quiz/${sharedQuiz._id}`)
                .set('Authorization', `Bearer ${participantToken}`);

            expect(response.status).toBe(200);
            expect(response.body.title).toBe('Shared Quiz');
        });

        it('should deny access to shared quiz for user not in sharedWith list', async () => {
            const response = await request(app)
                .get(`/api/quiz/${sharedQuiz._id}`)
                .set('Authorization', `Bearer ${otherToken}`);

            expect(response.status).toBe(403);
        });

        it('should allow quiz owner to access their shared quiz', async () => {
            const response = await request(app)
                .get(`/api/quiz/${sharedQuiz._id}`)
                .set('Authorization', `Bearer ${hostToken}`);

            expect(response.status).toBe(200);
            expect(response.body.title).toBe('Shared Quiz');
        });
    });

    describe('Grant Quiz Access (Requirement 8.6)', () => {
        it('should allow quiz owner to grant access to another user', async () => {
            const response = await request(app)
                .post(`/api/quiz/${sharedQuiz._id}/access/grant`)
                .set('Authorization', `Bearer ${hostToken}`)
                .send({ userId: otherUser._id.toString() });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.userId).toBe(otherUser._id.toString());

            // Verify access was granted
            const updatedQuiz = await Quiz.findById(sharedQuiz._id);
            expect(updatedQuiz.sharedWith.map(id => id.toString())).toContain(otherUser._id.toString());
        });

        it('should allow granting access by email', async () => {
            // Create a new shared quiz for this test
            const newSharedQuiz = await Quiz.create({
                title: 'New Shared Quiz',
                hostId: hostUser._id,
                roomCode: 'SHARE2',
                accessType: 'shared',
                sharedWith: [],
                questions: [
                    {
                        text: 'Test question',
                        options: ['A', 'B', 'C', 'D'],
                        correctOption: 0,
                        hashedCorrectAnswer: 'hashed_A',
                        timeLimit: 30,
                    },
                ],
            });

            const response = await request(app)
                .post(`/api/quiz/${newSharedQuiz._id}/access/grant`)
                .set('Authorization', `Bearer ${hostToken}`)
                .send({ email: 'other@test.com' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify access was granted
            const updatedQuiz = await Quiz.findById(newSharedQuiz._id);
            expect(updatedQuiz.sharedWith.map(id => id.toString())).toContain(otherUser._id.toString());
        });

        it('should prevent non-owner from granting access', async () => {
            const response = await request(app)
                .post(`/api/quiz/${sharedQuiz._id}/access/grant`)
                .set('Authorization', `Bearer ${participantToken}`)
                .send({ userId: otherUser._id.toString() });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should prevent granting access to non-shared quiz', async () => {
            const response = await request(app)
                .post(`/api/quiz/${publicQuiz._id}/access/grant`)
                .set('Authorization', `Bearer ${hostToken}`)
                .send({ userId: otherUser._id.toString() });

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('shared');
        });

        it('should prevent duplicate access grants', async () => {
            // First grant should succeed
            await request(app)
                .post(`/api/quiz/${sharedQuiz._id}/access/grant`)
                .set('Authorization', `Bearer ${hostToken}`)
                .send({ userId: participantUser._id.toString() });

            // Second grant should fail
            const response = await request(app)
                .post(`/api/quiz/${sharedQuiz._id}/access/grant`)
                .set('Authorization', `Bearer ${hostToken}`)
                .send({ userId: participantUser._id.toString() });

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('already has access');
        });

        it('should return 404 for non-existent user', async () => {
            const fakeUserId = new mongoose.Types.ObjectId();
            const response = await request(app)
                .post(`/api/quiz/${sharedQuiz._id}/access/grant`)
                .set('Authorization', `Bearer ${hostToken}`)
                .send({ userId: fakeUserId.toString() });

            expect(response.status).toBe(404);
            expect(response.body.message).toContain('User not found');
        });
    });

    describe('Revoke Quiz Access (Requirement 8.6)', () => {
        beforeEach(async () => {
            // Ensure otherUser has access for revocation tests
            const quiz = await Quiz.findById(sharedQuiz._id);
            if (!quiz.sharedWith.some(id => id.toString() === otherUser._id.toString())) {
                quiz.sharedWith.push(otherUser._id);
                await quiz.save();
            }
        });

        it('should allow quiz owner to revoke access from a user', async () => {
            const response = await request(app)
                .delete(`/api/quiz/${sharedQuiz._id}/access/revoke/${otherUser._id}`)
                .set('Authorization', `Bearer ${hostToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify access was revoked
            const updatedQuiz = await Quiz.findById(sharedQuiz._id);
            expect(updatedQuiz.sharedWith.map(id => id.toString())).not.toContain(otherUser._id.toString());
        });

        it('should prevent non-owner from revoking access', async () => {
            const response = await request(app)
                .delete(`/api/quiz/${sharedQuiz._id}/access/revoke/${otherUser._id}`)
                .set('Authorization', `Bearer ${participantToken}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should return error when revoking access from user without access', async () => {
            // First revoke access
            await request(app)
                .delete(`/api/quiz/${sharedQuiz._id}/access/revoke/${otherUser._id}`)
                .set('Authorization', `Bearer ${hostToken}`);

            // Try to revoke again
            const response = await request(app)
                .delete(`/api/quiz/${sharedQuiz._id}/access/revoke/${otherUser._id}`)
                .set('Authorization', `Bearer ${hostToken}`);

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('does not have access');
        });

        it('should allow admin to revoke access', async () => {
            const response = await request(app)
                .delete(`/api/quiz/${sharedQuiz._id}/access/revoke/${participantUser._id}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('Automatic Access Revocation on Quiz Deletion (Requirement 8.7)', () => {
        it('should revoke all access when quiz is deleted', async () => {
            // Create a quiz with shared access
            const tempQuiz = await Quiz.create({
                title: 'Temp Shared Quiz',
                hostId: hostUser._id,
                roomCode: 'TEMP01',
                accessType: 'shared',
                sharedWith: [participantUser._id, otherUser._id],
                questions: [
                    {
                        text: 'Temp question',
                        options: ['A', 'B', 'C', 'D'],
                        correctOption: 0,
                        hashedCorrectAnswer: 'hashed_A',
                        timeLimit: 30,
                    },
                ],
            });

            expect(tempQuiz.sharedWith.length).toBe(2);

            // Delete the quiz
            const response = await request(app)
                .delete(`/api/quiz/${tempQuiz._id}`)
                .set('Authorization', `Bearer ${hostToken}`);

            expect(response.status).toBe(200);

            // Verify quiz is deleted
            const deletedQuiz = await Quiz.findById(tempQuiz._id);
            expect(deletedQuiz).toBeNull();
        });
    });

    describe('Access Policy Enforcement', () => {
        it('should enforce access policy when updating quiz', async () => {
            const response = await request(app)
                .put(`/api/quiz/${privateQuiz._id}`)
                .set('Authorization', `Bearer ${otherToken}`)
                .send({ title: 'Hacked Title' });

            expect(response.status).toBe(403);
        });

        it('should enforce access policy when deleting quiz', async () => {
            const response = await request(app)
                .delete(`/api/quiz/${privateQuiz._id}`)
                .set('Authorization', `Bearer ${otherToken}`);

            expect(response.status).toBe(403);
        });

        it('should allow owner to update quiz regardless of access type', async () => {
            const response = await request(app)
                .put(`/api/quiz/${privateQuiz._id}`)
                .set('Authorization', `Bearer ${hostToken}`)
                .send({ title: 'Updated Private Quiz' });

            expect(response.status).toBe(200);
            expect(response.body.title).toBe('Updated Private Quiz');
        });
    });

    describe('Get Quiz Access List', () => {
        it('should allow owner to view access list', async () => {
            const response = await request(app)
                .get(`/api/quiz/${sharedQuiz._id}/access`)
                .set('Authorization', `Bearer ${hostToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.accessType).toBe('shared');
            expect(Array.isArray(response.body.data.sharedWith)).toBe(true);
        });

        it('should prevent non-owner from viewing access list', async () => {
            const response = await request(app)
                .get(`/api/quiz/${sharedQuiz._id}/access`)
                .set('Authorization', `Bearer ${participantToken}`);

            expect(response.status).toBe(403);
        });

        it('should allow admin to view access list', async () => {
            const response = await request(app)
                .get(`/api/quiz/${sharedQuiz._id}/access`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });
});
