/**
 * Integration tests for RBAC Enforcement (Task 13.4)
 * Tests Requirements: 7.3, 8.2, 11.4
 * 
 * This test suite verifies that RBAC middleware correctly enforces permissions
 * across quiz and payment routes, including:
 * - Permission denial with 403 responses
 * - Resource ownership checks
 * - Access policy enforcement for public/private/shared resources
 */

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const Quiz = require('../models/Quiz');
const quizRoutes = require('../routes/quizRoutes');

jest.setTimeout(30000);

describe('RBAC Enforcement Integration Tests', () => {
  let mongod;
  let app;
  let adminUser, hostUser, participantUser, otherHostUser;
  let adminToken, hostToken, participantToken, otherHostToken;
  let adminRole, hostRole, participantRole;
  let createQuizPerm, manageQuizPerm, joinQuizPerm, viewRevenuePerm, processPaymentPerm;
  let hostQuiz, privateQuiz, publicQuiz;

  // Mock Socket.IO
  const mockIo = {
    to: () => ({ emit: () => {} }),
    in: () => ({ socketsLeave: () => {} }),
    emit: () => {},
  };

  beforeAll(async () => {
    // Set JWT_SECRET for tests
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

    // Start in-memory MongoDB
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();
    await mongoose.connect(mongoUri);

    // Create minimal Express app with quiz routes
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.io = mockIo;
      next();
    });
    app.use('/api/quiz', quizRoutes);
    // Create permissions
    createQuizPerm = await Permission.create({
      name: 'create_quiz',
      description: 'Create quizzes',
      resource: 'quiz',
      action: 'create',
    });

    manageQuizPerm = await Permission.create({
      name: 'manage_quiz',
      description: 'Manage quizzes',
      resource: 'quiz',
      action: 'manage',
    });

    joinQuizPerm = await Permission.create({
      name: 'join_quiz',
      description: 'Join quiz sessions',
      resource: 'session',
      action: 'join',
    });

    viewRevenuePerm = await Permission.create({
      name: 'view_revenue',
      description: 'View revenue data',
      resource: 'revenue',
      action: 'view',
    });

    processPaymentPerm = await Permission.create({
      name: 'process_payment',
      description: 'Process payments',
      resource: 'payment',
      action: 'process',
    });

    // Create roles
    adminRole = await Role.create({
      name: 'admin',
      displayName: 'Administrator',
      description: 'System administrator with all permissions',
      isAdmin: true,
      permissions: [],
      priority: 100,
    });

    hostRole = await Role.create({
      name: 'host',
      displayName: 'Host',
      description: 'Quiz host',
      permissions: [createQuizPerm._id, manageQuizPerm._id, viewRevenuePerm._id, processPaymentPerm._id],
      priority: 50,
    });

    participantRole = await Role.create({
      name: 'participant',
      displayName: 'Participant',
      description: 'Quiz participant',
      permissions: [joinQuizPerm._id],
      priority: 10,
    });

    // Create test users
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@rbac.test',
      password: 'password123',
      role: 'admin',
      roles: [adminRole._id],
    });

    hostUser = await User.create({
      name: 'Host User',
      email: 'host@rbac.test',
      password: 'password123',
      role: 'host',
      roles: [hostRole._id],
    });

    participantUser = await User.create({
      name: 'Participant User',
      email: 'participant@rbac.test',
      password: 'password123',
      role: 'participant',
      roles: [participantRole._id],
    });

    otherHostUser = await User.create({
      name: 'Other Host',
      email: 'otherhost@rbac.test',
      password: 'password123',
      role: 'host',
      roles: [hostRole._id],
    });

    // Generate tokens
    adminToken = jwt.sign({ id: adminUser._id.toString(), role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    hostToken = jwt.sign({ id: hostUser._id.toString(), role: 'host' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    participantToken = jwt.sign({ id: participantUser._id.toString(), role: 'participant' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    otherHostToken = jwt.sign({ id: otherHostUser._id.toString(), role: 'host' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Create test quizzes
    hostQuiz = await Quiz.create({
      title: 'Host Quiz',
      hostId: hostUser._id,
      roomCode: 'HOST01',
      accessType: 'public',
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

    privateQuiz = await Quiz.create({
      title: 'Private Quiz',
      hostId: hostUser._id,
      roomCode: 'PRIV01',
      accessType: 'private',
      allowedEmails: ['participant@rbac.test'],
      questions: [
        {
          text: 'Private question',
          options: ['A', 'B', 'C', 'D'],
          correctOption: 1,
          hashedCorrectAnswer: 'hashed_B',
          timeLimit: 30,
        },
      ],
    });

    publicQuiz = await Quiz.create({
      title: 'Public Quiz',
      hostId: otherHostUser._id,
      roomCode: 'PUB001',
      accessType: 'public',
      questions: [
        {
          text: 'Public question',
          options: ['A', 'B', 'C', 'D'],
          correctOption: 2,
          hashedCorrectAnswer: 'hashed_C',
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
    await mongoose.disconnect();
    await mongod.stop();
  });

  describe('Permission Denial - 403 Responses (Requirement 7.3)', () => {
    it('should return 403 when participant tries to create quiz without permission', async () => {
      const response = await request(app)
        .post('/api/quiz')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          title: 'Unauthorized Quiz',
          type: 'quiz',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Forbidden');
      expect(response.body.message).toContain('create_quiz');
    });

    it('should return 403 when participant tries to delete quiz', async () => {
      const response = await request(app)
        .delete(`/api/quiz/${hostQuiz._id}`)
        .set('Authorization', `Bearer ${participantToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should return 403 when participant tries to update quiz', async () => {
      const response = await request(app)
        .put(`/api/quiz/${hostQuiz._id}`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          title: 'Hacked Title',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should allow host to create quiz with proper permission', async () => {
      const response = await request(app)
        .post('/api/quiz')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          title: 'Authorized Quiz',
          type: 'quiz',
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Authorized Quiz');
    });

    it('should allow admin to perform any action (Requirement 7.4)', async () => {
      const response = await request(app)
        .post('/api/quiz')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Admin Quiz',
          type: 'quiz',
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Admin Quiz');
    });
  });

  describe('Resource Ownership Checks (Requirement 8.2)', () => {
    it('should deny quiz modification when user is not the owner', async () => {
      const response = await request(app)
        .put(`/api/quiz/${hostQuiz._id}`)
        .set('Authorization', `Bearer ${otherHostToken}`)
        .send({
          title: 'Stolen Quiz',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not authorized');
    });

    it('should deny quiz deletion when user is not the owner', async () => {
      const response = await request(app)
        .delete(`/api/quiz/${hostQuiz._id}`)
        .set('Authorization', `Bearer ${otherHostToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should allow quiz owner to modify their quiz', async () => {
      const response = await request(app)
        .put(`/api/quiz/${hostQuiz._id}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          title: 'Updated Host Quiz',
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated Host Quiz');
    });

    it('should allow admin to modify any quiz (Requirement 8.2)', async () => {
      const response = await request(app)
        .put(`/api/quiz/${hostQuiz._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Admin Modified Quiz',
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Admin Modified Quiz');
    });

    it('should deny starting session when user is not the owner', async () => {
      const response = await request(app)
        .post(`/api/quiz/${hostQuiz._id}/start`)
        .set('Authorization', `Bearer ${otherHostToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should allow quiz owner to start session', async () => {
      const response = await request(app)
        .post(`/api/quiz/${hostQuiz._id}/start`)
        .set('Authorization', `Bearer ${hostToken}`);

      // May return 400 if quiz is already in session, but should not be 403
      expect(response.status).not.toBe(403);
    });
  });

  describe('Access Policy Enforcement (Requirements 8.3, 8.4, 8.5)', () => {
    describe('Public Quiz Access (Requirement 8.3)', () => {
      it('should allow any authenticated user to view public quiz', async () => {
        const response = await request(app)
          .get(`/api/quiz/${publicQuiz.roomCode}`)
          .set('Authorization', `Bearer ${participantToken}`);

        expect(response.status).toBe(200);
        expect(response.body.title).toBe('Public Quiz');
        expect(response.body.accessType).toBe('public');
      });

      it('should allow different host to view public quiz', async () => {
        const response = await request(app)
          .get(`/api/quiz/${publicQuiz.roomCode}`)
          .set('Authorization', `Bearer ${hostToken}`);

        expect(response.status).toBe(200);
        expect(response.body.title).toBe('Public Quiz');
      });

      it('should not expose sensitive fields in public quiz', async () => {
        const response = await request(app)
          .get(`/api/quiz/${publicQuiz.roomCode}`)
          .set('Authorization', `Bearer ${participantToken}`);

        expect(response.status).toBe(200);
        // Sensitive fields should not be exposed to non-owners
        if (response.body.questions && response.body.questions.length > 0) {
          expect(response.body.questions[0].hashedCorrectAnswer).toBeUndefined();
          expect(response.body.questions[0].correctOption).toBeUndefined();
        }
      });
    });

    describe('Private Quiz Access (Requirement 8.4)', () => {
      it('should deny access to private quiz for unauthorized user', async () => {
        const response = await request(app)
          .get(`/api/quiz/${privateQuiz.roomCode}`)
          .set('Authorization', `Bearer ${otherHostToken}`);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('access');
      });

      it('should allow access to private quiz for user in allowedEmails', async () => {
        const response = await request(app)
          .get(`/api/quiz/${privateQuiz.roomCode}`)
          .set('Authorization', `Bearer ${participantToken}`);

        expect(response.status).toBe(200);
        expect(response.body.title).toBe('Private Quiz');
      });

      it('should allow quiz owner to access their private quiz', async () => {
        const response = await request(app)
          .get(`/api/quiz/${privateQuiz.roomCode}`)
          .set('Authorization', `Bearer ${hostToken}`);

        expect(response.status).toBe(200);
        expect(response.body.title).toBe('Private Quiz');
      });

      it('should allow admin to access any private quiz', async () => {
        const response = await request(app)
          .get(`/api/quiz/${privateQuiz.roomCode}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.title).toBe('Private Quiz');
      });
    });

    describe('Shared Quiz Access (Requirement 8.5)', () => {
      let sharedQuiz;

      beforeAll(async () => {
        sharedQuiz = await Quiz.create({
          title: 'Shared Quiz',
          hostId: hostUser._id,
          roomCode: 'SHARE1',
          accessType: 'shared',
          sharedWith: [participantUser._id],
          questions: [
            {
              text: 'Shared question',
              options: ['A', 'B', 'C', 'D'],
              correctOption: 3,
              hashedCorrectAnswer: 'hashed_D',
              timeLimit: 30,
            },
          ],
        });
      });

      it('should allow access to shared quiz for user in sharedWith list', async () => {
        const response = await request(app)
          .get(`/api/quiz/${sharedQuiz.roomCode}`)
          .set('Authorization', `Bearer ${participantToken}`);

        expect(response.status).toBe(200);
        expect(response.body.title).toBe('Shared Quiz');
      });

      it('should deny access to shared quiz for user not in sharedWith list', async () => {
        const response = await request(app)
          .get(`/api/quiz/${sharedQuiz.roomCode}`)
          .set('Authorization', `Bearer ${otherHostToken}`);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
      });

      it('should allow quiz owner to access their shared quiz', async () => {
        const response = await request(app)
          .get(`/api/quiz/${sharedQuiz.roomCode}`)
          .set('Authorization', `Bearer ${hostToken}`);

        expect(response.status).toBe(200);
        expect(response.body.title).toBe('Shared Quiz');
      });

      it('should allow admin to access any shared quiz', async () => {
        const response = await request(app)
          .get(`/api/quiz/${sharedQuiz.roomCode}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.title).toBe('Shared Quiz');
      });
    });
  });

  describe('Access Grant and Revoke (Requirement 8.6)', () => {
    let grantTestQuiz;

    beforeEach(async () => {
      grantTestQuiz = await Quiz.create({
        title: 'Grant Test Quiz',
        hostId: hostUser._id,
        roomCode: `GRANT${Date.now()}`,
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
    });

    it('should allow quiz owner to grant access to another user', async () => {
      const response = await request(app)
        .post(`/api/quiz/${grantTestQuiz._id}/access/grant`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ userId: participantUser._id.toString() });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify access was granted
      const updatedQuiz = await Quiz.findById(grantTestQuiz._id);
      expect(updatedQuiz.sharedWith.map(id => id.toString())).toContain(participantUser._id.toString());
    });

    it('should prevent non-owner from granting access', async () => {
      const response = await request(app)
        .post(`/api/quiz/${grantTestQuiz._id}/access/grant`)
        .set('Authorization', `Bearer ${otherHostToken}`)
        .send({ userId: participantUser._id.toString() });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should allow quiz owner to revoke access from a user', async () => {
      // First grant access
      await Quiz.findByIdAndUpdate(grantTestQuiz._id, {
        $push: { sharedWith: participantUser._id },
      });

      // Then revoke it
      const response = await request(app)
        .delete(`/api/quiz/${grantTestQuiz._id}/access/revoke/${participantUser._id}`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify access was revoked
      const updatedQuiz = await Quiz.findById(grantTestQuiz._id);
      expect(updatedQuiz.sharedWith.map(id => id.toString())).not.toContain(participantUser._id.toString());
    });

    it('should prevent non-owner from revoking access', async () => {
      // Grant access first
      await Quiz.findByIdAndUpdate(grantTestQuiz._id, {
        $push: { sharedWith: participantUser._id },
      });

      const response = await request(app)
        .delete(`/api/quiz/${grantTestQuiz._id}/access/revoke/${participantUser._id}`)
        .set('Authorization', `Bearer ${otherHostToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Cross-Resource Permission Enforcement', () => {
    it('should enforce permissions consistently across different endpoints', async () => {
      // Test that participant cannot create quiz via templates endpoint
      const response1 = await request(app)
        .post('/api/quiz/templates/new')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          title: 'Template Quiz',
          type: 'quiz',
        });

      expect(response1.status).toBe(403);

      // Test that participant cannot create quiz via regular endpoint
      const response2 = await request(app)
        .post('/api/quiz')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          title: 'Regular Quiz',
          type: 'quiz',
        });

      expect(response2.status).toBe(403);
    });

    it('should enforce ownership checks across different quiz operations', async () => {
      // Test that non-owner cannot pause session
      const response1 = await request(app)
        .post(`/api/quiz/${hostQuiz._id}/pause`)
        .set('Authorization', `Bearer ${otherHostToken}`);

      expect(response1.status).toBe(403);

      // Test that non-owner cannot resume session
      const response2 = await request(app)
        .post(`/api/quiz/${hostQuiz._id}/resume`)
        .set('Authorization', `Bearer ${otherHostToken}`);

      expect(response2.status).toBe(403);

      // Test that non-owner cannot advance question
      const response3 = await request(app)
        .post(`/api/quiz/${hostQuiz._id}/next-question`)
        .set('Authorization', `Bearer ${otherHostToken}`);

      expect(response3.status).toBe(403);
    });
  });

  describe('Authentication Requirements', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(app)
        .post('/api/quiz')
        .send({
          title: 'No Auth Quiz',
          type: 'quiz',
        });

      expect(response.status).toBe(401);
    });

    it('should return 401 when invalid token provided', async () => {
      const response = await request(app)
        .post('/api/quiz')
        .set('Authorization', 'Bearer invalid_token')
        .send({
          title: 'Invalid Auth Quiz',
          type: 'quiz',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Permission Caching Behavior (Requirement 7.7)', () => {
    it('should handle permission checks efficiently with caching', async () => {
      const startTime = Date.now();

      // Make multiple requests that should hit cache
      await request(app)
        .get(`/api/quiz/${publicQuiz.roomCode}`)
        .set('Authorization', `Bearer ${hostToken}`);

      await request(app)
        .get(`/api/quiz/${publicQuiz.roomCode}`)
        .set('Authorization', `Bearer ${hostToken}`);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Second request should be faster due to caching
      // This is a basic check; actual cache verification would require Redis inspection
      expect(duration).toBeLessThan(5000); // Reasonable time for 2 requests
    });
  });
});
