const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { createClient } = require('redis');
const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const rbacService = require('../services/rbac/rbac.service');

let mongoServer;
let mockRedisClient;

// Mock Redis client for testing
jest.mock('../config/redis', () => ({
  getRedisClient: jest.fn(),
}));

beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create mock Redis client
  mockRedisClient = {
    get: jest.fn().mockResolvedValue(null),
    setEx: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    scan: jest.fn().mockResolvedValue({ cursor: '0', keys: [] }),
  };

  // Set up the mock to return our client
  const { getRedisClient } = require('../config/redis');
  getRedisClient.mockReturnValue(mockRedisClient);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all collections
  await User.deleteMany({});
  await Role.deleteMany({});
  await Permission.deleteMany({});
  
  // Reset Redis mock
  jest.clearAllMocks();
  mockRedisClient.get.mockResolvedValue(null);
  
  // Re-setup the mock
  const { getRedisClient } = require('../config/redis');
  getRedisClient.mockReturnValue(mockRedisClient);
});

describe('RBAC Service - Permission Checks', () => {
  test('should grant permission when user has required role', async () => {
    // Create permission
    const permission = await Permission.create({
      name: 'create_quiz',
      description: 'Create quizzes',
      resource: 'quiz',
      action: 'create',
    });

    // Create role with permission
    const role = await Role.create({
      name: 'host',
      displayName: 'Host',
      description: 'Quiz host',
      permissions: [permission._id],
      priority: 50,
    });

    // Create user with role
    const user = await User.create({
      name: 'Test Host',
      email: 'host@test.com',
      password: 'password123',
      roles: [role._id],
    });

    // Check permission
    const hasPermission = await rbacService.checkPermission(user._id.toString(), 'create_quiz');
    expect(hasPermission).toBe(true);
  });

  test('should deny permission when user lacks required role', async () => {
    // Create permission
    const permission = await Permission.create({
      name: 'manage_users',
      description: 'Manage users',
      resource: 'user',
      action: 'manage',
    });

    // Create role without the permission
    const role = await Role.create({
      name: 'participant',
      displayName: 'Participant',
      description: 'Quiz participant',
      permissions: [],
      priority: 10,
    });

    // Create user with role
    const user = await User.create({
      name: 'Test Participant',
      email: 'participant@test.com',
      password: 'password123',
      roles: [role._id],
    });

    // Check permission
    const hasPermission = await rbacService.checkPermission(user._id.toString(), 'manage_users');
    expect(hasPermission).toBe(false);
  });

  test('should grant all permissions to admin role (Requirement 7.4)', async () => {
    // Create some permissions
    await Permission.create({
      name: 'manage_users',
      description: 'Manage users',
      resource: 'user',
      action: 'manage',
    });

    // Create admin role (no specific permissions needed)
    const adminRole = await Role.create({
      name: 'admin',
      displayName: 'Administrator',
      description: 'System administrator',
      isAdmin: true,
      permissions: [],
      priority: 100,
    });

    // Create admin user
    const user = await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'password123',
      roles: [adminRole._id],
    });

    // Admin should have any permission
    const hasPermission = await rbacService.checkPermission(user._id.toString(), 'manage_users');
    expect(hasPermission).toBe(true);
  });

  test('should support multiple roles with OR logic (Requirements 7.5, 7.6)', async () => {
    // Create permissions
    const perm1 = await Permission.create({
      name: 'create_quiz',
      description: 'Create quizzes',
      resource: 'quiz',
      action: 'create',
    });

    const perm2 = await Permission.create({
      name: 'view_revenue',
      description: 'View revenue',
      resource: 'revenue',
      action: 'view',
    });

    // Create host role with both permissions
    const role1 = await Role.create({
      name: 'host',
      displayName: 'Host',
      description: 'Quiz host',
      permissions: [perm1._id, perm2._id],
      priority: 50,
    });

    // Create user with the role
    const user = await User.create({
      name: 'Multi-Role User',
      email: 'multi@test.com',
      password: 'password123',
      roles: [role1._id],
    });

    // User should have both permissions from the role
    const hasPerm1 = await rbacService.checkPermission(user._id.toString(), 'create_quiz');
    const hasPerm2 = await rbacService.checkPermission(user._id.toString(), 'view_revenue');
    
    expect(hasPerm1).toBe(true);
    expect(hasPerm2).toBe(true);
  });

  test('should use Redis cache for permission checks (Requirement 7.7)', async () => {
    // Create permission and role
    const permission = await Permission.create({
      name: 'join_quiz',
      description: 'Join quiz',
      resource: 'session',
      action: 'join',
    });

    const role = await Role.create({
      name: 'participant',
      displayName: 'Participant',
      description: 'Quiz participant',
      permissions: [permission._id],
      priority: 10,
    });

    const user = await User.create({
      name: 'Test User',
      email: 'user@test.com',
      password: 'password123',
      roles: [role._id],
    });

    // First call - should miss cache and set it
    await rbacService.checkPermission(user._id.toString(), 'join_quiz');
    expect(mockRedisClient.get).toHaveBeenCalled();
    expect(mockRedisClient.setEx).toHaveBeenCalledWith(
      expect.stringContaining('rbac:permission:'),
      300, // 5 minutes TTL
      'true'
    );

    // Second call - should hit cache
    mockRedisClient.get.mockResolvedValueOnce('true');
    const hasPermission = await rbacService.checkPermission(user._id.toString(), 'join_quiz');
    expect(hasPermission).toBe(true);
  });

  test('should handle non-existent user gracefully', async () => {
    const fakeUserId = new mongoose.Types.ObjectId().toString();
    const hasPermission = await rbacService.checkPermission(fakeUserId, 'create_quiz');
    expect(hasPermission).toBe(false);
  });

  test('should handle non-existent permission gracefully', async () => {
    const user = await User.create({
      name: 'Test User',
      email: 'user@test.com',
      password: 'password123',
      roles: [],
    });

    const hasPermission = await rbacService.checkPermission(user._id.toString(), 'nonexistent_permission');
    expect(hasPermission).toBe(false);
  });
});

describe('RBAC Service - Helper Methods', () => {
  test('checkAnyPermission should return true if user has any permission', async () => {
    const perm1 = await Permission.create({
      name: 'create_quiz',
      description: 'Create quizzes',
      resource: 'quiz',
      action: 'create',
    });

    const role = await Role.create({
      name: 'host',
      displayName: 'Host',
      description: 'Quiz host',
      permissions: [perm1._id],
      priority: 50,
    });

    const user = await User.create({
      name: 'Test Host',
      email: 'host@test.com',
      password: 'password123',
      roles: [role._id],
    });

    const hasAny = await rbacService.checkAnyPermission(
      user._id.toString(),
      ['create_quiz', 'manage_users']
    );
    expect(hasAny).toBe(true);
  });

  test('checkAllPermissions should return true only if user has all permissions', async () => {
    const perm1 = await Permission.create({
      name: 'create_quiz',
      description: 'Create quizzes',
      resource: 'quiz',
      action: 'create',
    });

    const perm2 = await Permission.create({
      name: 'manage_quiz',
      description: 'Manage quizzes',
      resource: 'quiz',
      action: 'manage',
    });

    const role = await Role.create({
      name: 'host',
      displayName: 'Host',
      description: 'Quiz host',
      permissions: [perm1._id, perm2._id],
      priority: 50,
    });

    const user = await User.create({
      name: 'Test Host',
      email: 'host@test.com',
      password: 'password123',
      roles: [role._id],
    });

    const hasAll = await rbacService.checkAllPermissions(
      user._id.toString(),
      ['create_quiz', 'manage_quiz']
    );
    expect(hasAll).toBe(true);

    const hasAllWithExtra = await rbacService.checkAllPermissions(
      user._id.toString(),
      ['create_quiz', 'manage_users']
    );
    expect(hasAllWithExtra).toBe(false);
  });

  test('getUserPermissions should return all effective permissions', async () => {
    const perm1 = await Permission.create({
      name: 'create_quiz',
      description: 'Create quizzes',
      resource: 'quiz',
      action: 'create',
    });

    const perm2 = await Permission.create({
      name: 'join_quiz',
      description: 'Join quiz',
      resource: 'session',
      action: 'join',
    });

    const role = await Role.create({
      name: 'host',
      displayName: 'Host',
      description: 'Quiz host',
      permissions: [perm1._id, perm2._id],
      priority: 50,
    });

    const user = await User.create({
      name: 'Test Host',
      email: 'host@test.com',
      password: 'password123',
      roles: [role._id],
    });

    const permissions = await rbacService.getUserPermissions(user._id.toString());
    expect(permissions).toHaveLength(2);
    expect(permissions.map(p => p.name)).toContain('create_quiz');
    expect(permissions.map(p => p.name)).toContain('join_quiz');
  });

  test('getUserPermissions should return all permissions for admin', async () => {
    // Create multiple permissions
    await Permission.create([
      { name: 'create_quiz', description: 'Create', resource: 'quiz', action: 'create' },
      { name: 'manage_users', description: 'Manage', resource: 'user', action: 'manage' },
      { name: 'view_revenue', description: 'View', resource: 'revenue', action: 'view' },
    ]);

    const adminRole = await Role.create({
      name: 'admin',
      displayName: 'Administrator',
      description: 'System administrator',
      isAdmin: true,
      permissions: [],
      priority: 100,
    });

    const user = await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'password123',
      roles: [adminRole._id],
    });

    const permissions = await rbacService.getUserPermissions(user._id.toString());
    expect(permissions.length).toBeGreaterThanOrEqual(3);
  });
});

describe('RBAC Service - Cache Invalidation', () => {
  test('should invalidate user cache', async () => {
    const user = await User.create({
      name: 'Test User',
      email: 'user@test.com',
      password: 'password123',
      roles: [],
    });

    // Mock scan to return some keys
    mockRedisClient.scan.mockResolvedValueOnce({
      cursor: '0',
      keys: ['rbac:permission:user123:create_quiz', 'rbac:permission:user123:join_quiz'],
    });

    await rbacService.invalidateUserCache(user._id.toString());

    expect(mockRedisClient.scan).toHaveBeenCalled();
    expect(mockRedisClient.del).toHaveBeenCalledWith([
      'rbac:permission:user123:create_quiz',
      'rbac:permission:user123:join_quiz',
    ]);
  });
});

describe('RBAC Models', () => {
  test('Role.hasPermission should check permission correctly', async () => {
    const permission = await Permission.create({
      name: 'create_quiz',
      description: 'Create quizzes',
      resource: 'quiz',
      action: 'create',
    });

    const role = await Role.create({
      name: 'host',
      displayName: 'Host',
      description: 'Quiz host',
      permissions: [permission._id],
      priority: 50,
    });

    expect(role.hasPermission(permission._id)).toBe(true);
    expect(role.hasPermission(new mongoose.Types.ObjectId())).toBe(false);
  });

  test('Admin role should have all permissions via hasPermission', async () => {
    const adminRole = await Role.create({
      name: 'admin',
      displayName: 'Administrator',
      description: 'System administrator',
      isAdmin: true,
      permissions: [],
      priority: 100,
    });

    const anyPermissionId = new mongoose.Types.ObjectId();
    expect(adminRole.hasPermission(anyPermissionId)).toBe(true);
  });
});
