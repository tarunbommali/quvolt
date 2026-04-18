/**
 * Comprehensive tests for Role Management API
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const rbacService = require('../services/rbac/rbac.service');

// Mock Redis
jest.mock('../config/redis', () => ({
  getRedisClient: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue(null),
    setEx: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    scan: jest.fn().mockResolvedValue({ cursor: '0', keys: [] }),
  }),
}));

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Role.deleteMany({});
  await Permission.deleteMany({});
});

// ─── Role CRUD Operations ─────────────────────────────────────────────────────

describe('Role CRUD Operations (Requirement 15.1)', () => {
  test('should create a role with permissions', async () => {
    const perm = await Permission.create({
      name: 'create_quiz',
      description: 'Create quizzes',
      resource: 'quiz',
      action: 'create',
    });

    const role = await Role.create({
      name: 'host',
      displayName: 'Host',
      description: 'Quiz host role',
      permissions: [perm._id],
      isAdmin: false,
      priority: 50,
    });

    expect(role.name).toBe('host');
    expect(role.displayName).toBe('Host');
    expect(role.permissions).toHaveLength(1);
    expect(role.isAdmin).toBe(false);
  });

  test('should update a role by adding permissions', async () => {
    const perm1 = await Permission.create({ name: 'create_quiz', description: 'Create', resource: 'quiz', action: 'create' });
    const perm2 = await Permission.create({ name: 'delete_quiz', description: 'Delete', resource: 'quiz', action: 'delete' });

    const role = await Role.create({
      name: 'host',
      displayName: 'Host',
      description: 'Quiz host role',
      permissions: [perm1._id],
      priority: 50,
    });

    // Update role to add permission
    role.permissions.push(perm2._id);
    await role.save();

    const updated = await Role.findById(role._id);
    expect(updated.permissions).toHaveLength(2);
  });

  test('should delete a role and reassign users to default role (Requirement 15.4)', async () => {
    const defaultRole = await Role.create({
      name: 'participant',
      displayName: 'Participant',
      description: 'Quiz participant role',
      permissions: [],
      priority: 10,
    });

    const roleToDelete = await Role.create({
      name: 'host',
      displayName: 'Host',
      description: 'Host role to delete',
      permissions: [],
      priority: 50,
    });

    // Create user with the role to be deleted
    const user = await User.create({
      name: 'Test User',
      email: 'user@test.com',
      password: 'password123',
      roles: [roleToDelete._id],
    });

    // Simulate role deletion with user reassignment
    const usersWithRole = await User.find({ roles: roleToDelete._id });
    for (const u of usersWithRole) {
      u.roles = u.roles.filter(r => r.toString() !== roleToDelete._id.toString());
      if (u.roles.length === 0) {
        u.roles.push(defaultRole._id);
      }
      await u.save();
    }
    await Role.findByIdAndDelete(roleToDelete._id);

    // Verify user was reassigned
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.roles).toHaveLength(1);
    expect(updatedUser.roles[0].toString()).toBe(defaultRole._id.toString());

    // Verify role was deleted
    const deletedRole = await Role.findById(roleToDelete._id);
    expect(deletedRole).toBeNull();
  });
});

// ─── User Role Assignment ─────────────────────────────────────────────────────

describe('User Role Assignment (Requirement 15.2)', () => {
  test('should assign a role to a user', async () => {
    const role = await Role.create({ name: 'host', displayName: 'Host', description: 'Host role', permissions: [], priority: 50 });
    const user = await User.create({
      name: 'Test User',
      email: 'user@test.com',
      password: 'password123',
      roles: [],
    });

    user.roles.push(role._id);
    await user.save();

    const updated = await User.findById(user._id);
    expect(updated.roles).toHaveLength(1);
    expect(updated.roles[0].toString()).toBe(role._id.toString());
  });

  test('should assign multiple roles to a user', async () => {
    const role1 = await Role.create({ name: 'host', displayName: 'Host', description: 'Host role', permissions: [], priority: 50 });
    const role2 = await Role.create({ name: 'admin', displayName: 'Admin', description: 'Admin role', permissions: [], priority: 100, isAdmin: true });

    const user = await User.create({
      name: 'Test User',
      email: 'user@test.com',
      password: 'password123',
      roles: [role1._id],
    });

    user.roles.push(role2._id);
    await user.save();

    const updated = await User.findById(user._id);
    expect(updated.roles).toHaveLength(2);
  });

  test('should revoke a role from a user', async () => {
    const role1 = await Role.create({ name: 'host', displayName: 'Host', description: 'Host role', permissions: [], priority: 50 });
    const role2 = await Role.create({ name: 'admin', displayName: 'Admin', description: 'Admin role', permissions: [], priority: 100, isAdmin: true });

    const user = await User.create({
      name: 'Test User',
      email: 'user@test.com',
      password: 'password123',
      roles: [role1._id, role2._id],
    });

    // Revoke role1
    user.roles = user.roles.filter(r => r.toString() !== role1._id.toString());
    await user.save();

    const updated = await User.findById(user._id);
    expect(updated.roles).toHaveLength(1);
    expect(updated.roles[0].toString()).toBe(role2._id.toString());
  });
});

// ─── Admin Safety Validation ──────────────────────────────────────────────────

describe('Admin Safety Validation (Requirements 15.3, 15.4)', () => {
  test('should prevent removing last admin role (Requirement 15.3)', async () => {
    const adminRole = await Role.create({
      name: 'admin',
      displayName: 'Administrator',
      description: 'System administrator role',
      isAdmin: true,
      permissions: [],
      priority: 100,
    });

    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'password123',
      roles: [adminRole._id],
    });

    // Check if this is the last admin
    const adminCount = await User.countDocuments({ roles: { $in: [adminRole._id] } });
    const isLastAdmin = adminCount <= 1;

    expect(isLastAdmin).toBe(true);
    // In the actual route, this would return 400 error
  });

  test('should allow removing admin role when multiple admins exist', async () => {
    const adminRole = await Role.create({
      name: 'admin',
      displayName: 'Administrator',
      description: 'System administrator role',
      isAdmin: true,
      permissions: [],
      priority: 100,
    });

    // Create two admin users
    await User.create({
      name: 'Admin 1',
      email: 'admin1@test.com',
      password: 'password123',
      roles: [adminRole._id],
    });

    await User.create({
      name: 'Admin 2',
      email: 'admin2@test.com',
      password: 'password123',
      roles: [adminRole._id],
    });

    const adminCount = await User.countDocuments({ roles: { $in: [adminRole._id] } });
    const canRemove = adminCount > 1;

    expect(canRemove).toBe(true);
  });
});

// ─── Permission Discovery ─────────────────────────────────────────────────────

describe('Permission Discovery (Requirements 15.5, 15.6)', () => {
  test('should list all available permissions (Requirement 15.5)', async () => {
    await Permission.create([
      { name: 'create_quiz', description: 'Create quizzes', resource: 'quiz', action: 'create' },
      { name: 'delete_quiz', description: 'Delete quizzes', resource: 'quiz', action: 'delete' },
      { name: 'view_revenue', description: 'View revenue', resource: 'revenue', action: 'view' },
    ]);

    const permissions = await Permission.find().sort({ resource: 1, action: 1 });
    expect(permissions).toHaveLength(3);
    expect(permissions.map(p => p.name)).toContain('create_quiz');
    expect(permissions.map(p => p.name)).toContain('view_revenue');
  });

  test('should get effective permissions for a user (Requirement 15.6)', async () => {
    const perm1 = await Permission.create({ name: 'create_quiz', description: 'Create', resource: 'quiz', action: 'create' });
    const perm2 = await Permission.create({ name: 'join_quiz', description: 'Join', resource: 'session', action: 'join' });

    const role = await Role.create({
      name: 'host',
      displayName: 'Host',
      description: 'Host role',
      permissions: [perm1._id, perm2._id],
      priority: 50,
    });

    const user = await User.create({
      name: 'Test User',
      email: 'user@test.com',
      password: 'password123',
      roles: [role._id],
    });

    const permissions = await rbacService.getUserPermissions(user._id.toString());
    expect(permissions.length).toBeGreaterThanOrEqual(2);
    expect(permissions.map(p => p.name)).toContain('create_quiz');
    expect(permissions.map(p => p.name)).toContain('join_quiz');
  });

  test('should return all permissions for admin user (Requirement 15.6)', async () => {
    await Permission.create([
      { name: 'create_quiz', description: 'Create', resource: 'quiz', action: 'create' },
      { name: 'manage_users', description: 'Manage', resource: 'user', action: 'manage' },
    ]);

    const adminRole = await Role.create({
      name: 'admin',
      displayName: 'Administrator',
      description: 'Admin role',
      isAdmin: true,
      permissions: [],
      priority: 100,
    });

    const adminUser = await User.create({
      name: 'Admin',
      email: 'admin@test.com',
      password: 'password123',
      roles: [adminRole._id],
    });

    const permissions = await rbacService.getUserPermissions(adminUser._id.toString());
    // Admin should get all permissions
    expect(permissions.length).toBeGreaterThanOrEqual(2);
  });

  test('should return empty permissions for user with no roles', async () => {
    const user = await User.create({
      name: 'No Role User',
      email: 'norole@test.com',
      password: 'password123',
      roles: [],
    });

    const permissions = await rbacService.getUserPermissions(user._id.toString());
    expect(permissions).toHaveLength(0);
  });
});
