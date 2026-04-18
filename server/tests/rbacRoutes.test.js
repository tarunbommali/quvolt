/**
 * RBAC Routes Integration Tests
 * Tests permission revocation API endpoints
 * Requirement: 10.6, 15
 */

const request = require('supertest');
const express = require('express');
const rbacRoutes = require('../routes/rbac.routes');
const { protect } = require('../middleware/auth');
const rbacService = require('../services/rbac/rbac.service');
const permissionRevocationService = require('../services/rbac/permissionRevocation.service');
const User = require('../models/User');
const Role = require('../models/Role');

// Mock dependencies
jest.mock('../middleware/auth');
jest.mock('../services/rbac/rbac.service');
jest.mock('../services/rbac/permissionRevocation.service');
jest.mock('../models/User');
jest.mock('../models/Role');
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('RBAC Routes', () => {
  let app;
  let mockAdminUser;
  let mockRegularUser;

  beforeEach(() => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/rbac', rbacRoutes);

    // Mock users
    mockAdminUser = {
      _id: 'admin123',
      name: 'Admin User',
      email: 'admin@test.com',
      role: 'admin',
    };

    mockRegularUser = {
      _id: 'user123',
      name: 'Regular User',
      email: 'user@test.com',
      role: 'participant',
    };

    // Mock protect middleware
    protect.mockImplementation((req, res, next) => {
      req.user = mockAdminUser; // Default to admin
      next();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/rbac/revoke-permission', () => {
    it('should revoke permission and disconnect user (admin)', async () => {
      const targetUser = {
        _id: 'target123',
        name: 'Target User',
        email: 'target@test.com',
      };

      User.findById.mockResolvedValue(targetUser);
      permissionRevocationService.revokePermission.mockResolvedValue(undefined);
      rbacService.invalidateUserCache.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/rbac/revoke-permission')
        .send({
          userId: 'target123',
          permission: 'join_quiz',
          reason: 'Policy violation',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('disconnected');
      
      expect(permissionRevocationService.revokePermission).toHaveBeenCalledWith(
        'target123',
        'join_quiz',
        'Policy violation'
      );
      expect(rbacService.invalidateUserCache).toHaveBeenCalledWith('target123');
    });

    it('should reject non-admin users', async () => {
      protect.mockImplementation((req, res, next) => {
        req.user = mockRegularUser;
        next();
      });

      const response = await request(app)
        .post('/api/rbac/revoke-permission')
        .send({
          userId: 'target123',
          permission: 'join_quiz',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('administrators');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/rbac/revoke-permission')
        .send({
          userId: 'target123',
          // Missing permission
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    it('should handle non-existent user', async () => {
      User.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/rbac/revoke-permission')
        .send({
          userId: 'nonexistent',
          permission: 'join_quiz',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should use default reason if not provided', async () => {
      const targetUser = { _id: 'target123' };
      User.findById.mockResolvedValue(targetUser);
      permissionRevocationService.revokePermission.mockResolvedValue(undefined);
      rbacService.invalidateUserCache.mockResolvedValue(undefined);

      await request(app)
        .post('/api/rbac/revoke-permission')
        .send({
          userId: 'target123',
          permission: 'join_quiz',
        });

      expect(permissionRevocationService.revokePermission).toHaveBeenCalledWith(
        'target123',
        'join_quiz',
        'Permission revoked by administrator'
      );
    });

    it('should handle service errors', async () => {
      User.findById.mockResolvedValue({ _id: 'target123' });
      permissionRevocationService.revokePermission.mockRejectedValue(
        new Error('Service error')
      );

      const response = await request(app)
        .post('/api/rbac/revoke-permission')
        .send({
          userId: 'target123',
          permission: 'join_quiz',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/rbac/revoke-role', () => {
    it('should revoke role and disconnect user (admin)', async () => {
      const targetUser = {
        _id: 'target123',
        name: 'Target User',
        roles: [{ _id: 'role123' }, { _id: 'role456' }],
        save: jest.fn().mockResolvedValue(undefined),
      };

      const role = {
        _id: 'role123',
        name: 'participant',
        displayName: 'Participant',
      };

      User.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(targetUser),
      });
      Role.findById.mockResolvedValue(role);
      permissionRevocationService.revokeUserRole.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/rbac/revoke-role')
        .send({
          userId: 'target123',
          roleId: 'role123',
          reason: 'Role reassignment',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.roleName).toBe('participant');
      
      expect(targetUser.save).toHaveBeenCalled();
      expect(targetUser.roles).toHaveLength(1);
      expect(targetUser.roles[0]._id).toBe('role456');
      
      expect(permissionRevocationService.revokeUserRole).toHaveBeenCalledWith(
        'target123',
        'participant',
        'Role reassignment'
      );
    });

    it('should reject non-admin users', async () => {
      protect.mockImplementation((req, res, next) => {
        req.user = mockRegularUser;
        next();
      });

      const response = await request(app)
        .post('/api/rbac/revoke-role')
        .send({
          userId: 'target123',
          roleId: 'role123',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/rbac/revoke-role')
        .send({
          userId: 'target123',
          // Missing roleId
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle non-existent role', async () => {
      const targetUser = {
        _id: 'target123',
        roles: [],
      };

      User.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(targetUser),
      });
      Role.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/rbac/revoke-role')
        .send({
          userId: 'target123',
          roleId: 'nonexistent',
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Role not found');
    });
  });

  describe('GET /api/rbac/user/:userId/connections', () => {
    it('should return active connections for user (admin)', async () => {
      const targetUser = {
        _id: 'target123',
        name: 'Target User',
        email: 'target@test.com',
        role: 'participant',
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(targetUser),
      });

      const socketIds = ['socket1', 'socket2', 'socket3'];
      permissionRevocationService.getUserConnections.mockResolvedValue(socketIds);

      const response = await request(app)
        .get('/api/rbac/user/target123/connections');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.activeConnections).toBe(3);
      expect(response.body.data.socketIds).toEqual(socketIds);
      expect(response.body.data.user.id).toBe('target123');
    });

    it('should reject non-admin users', async () => {
      protect.mockImplementation((req, res, next) => {
        req.user = mockRegularUser;
        next();
      });

      const response = await request(app)
        .get('/api/rbac/user/target123/connections');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should handle non-existent user', async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const response = await request(app)
        .get('/api/rbac/user/nonexistent/connections');

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('GET /api/rbac/user/:userId/permissions', () => {
    it('should return user permissions (admin viewing any user)', async () => {
      const permissions = [
        {
          _id: 'perm1',
          name: 'join_quiz',
          description: 'Join quiz sessions',
          resource: 'quiz',
          action: 'join',
        },
        {
          _id: 'perm2',
          name: 'view_quiz',
          description: 'View quiz content',
          resource: 'quiz',
          action: 'view',
        },
      ];

      rbacService.getUserPermissions.mockResolvedValue(permissions);

      const response = await request(app)
        .get('/api/rbac/user/target123/permissions');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.permissions).toHaveLength(2);
      expect(response.body.data.permissions[0].name).toBe('join_quiz');
    });

    it('should allow users to view their own permissions', async () => {
      protect.mockImplementation((req, res, next) => {
        req.user = mockRegularUser;
        next();
      });

      rbacService.getUserPermissions.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/rbac/user/user123/permissions');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject users viewing other users permissions', async () => {
      protect.mockImplementation((req, res, next) => {
        req.user = mockRegularUser;
        next();
      });

      const response = await request(app)
        .get('/api/rbac/user/otheruser/permissions');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('own permissions');
    });

    it('should handle service errors', async () => {
      rbacService.getUserPermissions.mockRejectedValue(
        new Error('Service error')
      );

      const response = await request(app)
        .get('/api/rbac/user/target123/permissions');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});
