/**
 * Tests for Session Access Control Service
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */

const sessionAccessControl = require('../services/session/sessionAccessControl');
const rbacService = require('../services/rbac/rbac.service');

// Mock dependencies
jest.mock('../services/rbac/rbac.service');
jest.mock('../models/Quiz');
jest.mock('../models/QuizSession');
jest.mock('../models/User');

const Quiz = require('../models/Quiz');
const QuizSession = require('../models/QuizSession');
const User = require('../models/User');

describe('Session Access Control (Requirements 10.1-10.6)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── canJoinSession ──────────────────────────────────────────────────────────

  describe('canJoinSession - join_quiz permission check (Requirement 10.1)', () => {
    test('should deny join when user lacks join_quiz permission', async () => {
      rbacService.checkPermission.mockResolvedValue(false);

      const user = { _id: 'user1', email: 'user@test.com', role: 'participant' };
      const quiz = { _id: 'quiz1', accessType: 'public', allowedEmails: [], sharedWith: [] };

      const result = await sessionAccessControl.canJoinSession(user, quiz);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('permission');
    });

    test('should allow join when user has join_quiz permission and quiz is public', async () => {
      rbacService.checkPermission.mockResolvedValue(true);

      const user = { _id: 'user1', email: 'user@test.com', role: 'participant' };
      const quiz = { _id: 'quiz1', accessType: 'public', allowedEmails: [], sharedWith: [] };

      const result = await sessionAccessControl.canJoinSession(user, quiz);

      expect(result.allowed).toBe(true);
    });
  });

  describe('canJoinSession - private quiz access (Requirement 10.2)', () => {
    test('should deny join for private quiz when email not in allowedEmails', async () => {
      rbacService.checkPermission.mockResolvedValue(true);

      const user = { _id: 'user1', email: 'notallowed@test.com', role: 'participant' };
      const quiz = {
        _id: 'quiz1',
        accessType: 'private',
        allowedEmails: ['allowed@test.com'],
        sharedWith: [],
        hostId: 'host1',
      };

      const result = await sessionAccessControl.canJoinSession(user, quiz);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('private');
    });

    test('should allow join for private quiz when email is in allowedEmails', async () => {
      rbacService.checkPermission.mockResolvedValue(true);

      const user = { _id: 'user1', email: 'allowed@test.com', role: 'participant' };
      const quiz = {
        _id: 'quiz1',
        accessType: 'private',
        allowedEmails: ['allowed@test.com'],
        sharedWith: [],
        hostId: 'host1',
      };

      const result = await sessionAccessControl.canJoinSession(user, quiz);

      expect(result.allowed).toBe(true);
    });
  });

  describe('canJoinSession - access policy inheritance (Requirement 10.4)', () => {
    test('should inherit quiz access policy when session uses inherit', async () => {
      rbacService.checkPermission.mockResolvedValue(true);

      const user = { _id: 'user1', email: 'notallowed@test.com', role: 'participant' };
      const quiz = {
        _id: 'quiz1',
        accessType: 'private',
        allowedEmails: ['allowed@test.com'],
        sharedWith: [],
        hostId: 'host1',
      };
      const session = {
        _id: 'session1',
        accessType: 'inherit', // Inherit from quiz
        allowedEmails: [],
        sharedWith: [],
      };

      const result = await sessionAccessControl.canJoinSession(user, quiz, session);

      // Should use quiz's private policy
      expect(result.allowed).toBe(false);
    });
  });

  describe('canJoinSession - session-specific override (Requirement 10.5)', () => {
    test('should use session access policy when session overrides quiz', async () => {
      rbacService.checkPermission.mockResolvedValue(true);

      const user = { _id: 'user1', email: 'user@test.com', role: 'participant' };
      const quiz = {
        _id: 'quiz1',
        accessType: 'private', // Quiz is private
        allowedEmails: [],
        sharedWith: [],
        hostId: 'host1',
      };
      const session = {
        _id: 'session1',
        accessType: 'public', // Session overrides to public
        allowedEmails: [],
        sharedWith: [],
      };

      const result = await sessionAccessControl.canJoinSession(user, quiz, session);

      // Session override makes it public
      expect(result.allowed).toBe(true);
    });
  });

  describe('canJoinSession - admin/host bypass', () => {
    test('should allow admin to join any session regardless of access policy', async () => {
      rbacService.checkPermission.mockResolvedValue(true);

      const user = { _id: 'admin1', email: 'admin@test.com', role: 'admin' };
      const quiz = {
        _id: 'quiz1',
        accessType: 'private',
        allowedEmails: [],
        sharedWith: [],
        hostId: 'host1',
      };

      const result = await sessionAccessControl.canJoinSession(user, quiz);

      expect(result.allowed).toBe(true);
    });

    test('should allow host to join any session regardless of access policy', async () => {
      rbacService.checkPermission.mockResolvedValue(true);

      const user = { _id: 'host1', email: 'host@test.com', role: 'host' };
      const quiz = {
        _id: 'quiz1',
        accessType: 'private',
        allowedEmails: [],
        sharedWith: [],
        hostId: 'host1',
      };

      const result = await sessionAccessControl.canJoinSession(user, quiz);

      expect(result.allowed).toBe(true);
    });
  });

  describe('canJoinSession - shared access', () => {
    test('should allow join for shared quiz when user is in sharedWith', async () => {
      rbacService.checkPermission.mockResolvedValue(true);

      const user = { _id: 'user1', email: 'user@test.com', role: 'participant' };
      const quiz = {
        _id: 'quiz1',
        accessType: 'shared',
        allowedEmails: [],
        sharedWith: ['user1'],
        hostId: 'host1',
      };

      const result = await sessionAccessControl.canJoinSession(user, quiz);

      expect(result.allowed).toBe(true);
    });

    test('should deny join for shared quiz when user is NOT in sharedWith', async () => {
      rbacService.checkPermission.mockResolvedValue(true);

      const user = { _id: 'user2', email: 'user2@test.com', role: 'participant' };
      const quiz = {
        _id: 'quiz1',
        accessType: 'shared',
        allowedEmails: [],
        sharedWith: ['user1'],
        hostId: 'host1',
      };

      const result = await sessionAccessControl.canJoinSession(user, quiz);

      expect(result.allowed).toBe(false);
    });
  });

  describe('canJoinSession - error handling', () => {
    test('should deny access on error (fail closed)', async () => {
      rbacService.checkPermission.mockRejectedValue(new Error('Redis error'));

      const user = { _id: 'user1', email: 'user@test.com', role: 'participant' };
      const quiz = { _id: 'quiz1', accessType: 'public' };

      const result = await sessionAccessControl.canJoinSession(user, quiz);

      expect(result.allowed).toBe(false);
    });
  });

  // ─── updateSessionAccessPolicy ───────────────────────────────────────────────

  describe('updateSessionAccessPolicy (Requirement 10.3)', () => {
    test('should update session access policy when host is owner', async () => {
      const mockSession = {
        _id: 'session1',
        quizId: 'quiz1',
        accessType: 'inherit',
        allowedEmails: [],
        sharedWith: [],
        save: jest.fn().mockResolvedValue(true),
      };

      const mockQuiz = {
        _id: 'quiz1',
        hostId: 'host1',
      };

      QuizSession.findById = jest.fn().mockResolvedValue(mockSession);
      Quiz.findById = jest.fn().mockResolvedValue(mockQuiz);

      const result = await sessionAccessControl.updateSessionAccessPolicy(
        'session1',
        'host1',
        { accessType: 'private', allowedEmails: ['user@test.com'] }
      );

      expect(result.success).toBe(true);
      expect(mockSession.accessType).toBe('private');
      expect(mockSession.allowedEmails).toEqual(['user@test.com']);
      expect(mockSession.save).toHaveBeenCalled();
    });

    test('should deny update when user is not the host', async () => {
      const mockSession = {
        _id: 'session1',
        quizId: 'quiz1',
        save: jest.fn(),
      };

      const mockQuiz = {
        _id: 'quiz1',
        hostId: 'host1', // Different from the requesting user
      };

      const mockUser = { _id: 'other_user', role: 'participant' };

      QuizSession.findById = jest.fn().mockResolvedValue(mockSession);
      Quiz.findById = jest.fn().mockResolvedValue(mockQuiz);
      User.findById = jest.fn().mockResolvedValue(mockUser);

      const result = await sessionAccessControl.updateSessionAccessPolicy(
        'session1',
        'other_user',
        { accessType: 'private' }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unauthorized');
    });

    test('should return error when session not found', async () => {
      QuizSession.findById = jest.fn().mockResolvedValue(null);

      const result = await sessionAccessControl.updateSessionAccessPolicy(
        'nonexistent',
        'host1',
        { accessType: 'private' }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });
});
