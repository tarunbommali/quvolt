#!/usr/bin/env node

/**
 * RBAC Seeding Script
 * Seeds default roles and permissions for the RBAC system
 * Requirements: 7.1
 * 
 * Usage: node server/scripts/seedRBAC.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Permission = require('../models/Permission');
const Role = require('../models/Role');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const logger = require('../utils/logger');
const { getPlanConfig } = require('../config/plans');

const Users = [
  {
    name: 'admin',
    email: 'admin@quvolt.com',
    password: 'abcd@1234',
    role: 'admin',
  },
  {
    name: 'host',
    email: 'host@quvolt.com',
    password: 'abcd@1234',
    role: 'host',
  },
  {
    name: 'participant',
    email: 'participant@quvolt.com',
    password: 'abcd@1234',
    role: 'participant',
  },
  {
    name: 'creator',
    email: 'creator@quvolt.com',
    password: 'abcd@1234',
    role: 'host',
  },
  {
    name: 'teams',
    email: 'teams@quvolt.com',
    password: 'abcd@1234',
    role: 'host',
  },
]

// Load environment variables
require('dotenv').config();

// Permission definitions
const PERMISSIONS = [
  {
    name: 'create_quiz',
    description: 'Create new quizzes',
    resource: 'quiz',
    action: 'create',
  },
  {
    name: 'manage_quiz',
    description: 'Manage and edit quizzes',
    resource: 'quiz',
    action: 'manage',
  },
  {
    name: 'delete_quiz',
    description: 'Delete quizzes',
    resource: 'quiz',
    action: 'delete',
  },
  {
    name: 'view_quiz',
    description: 'View quiz content',
    resource: 'quiz',
    action: 'view',
  },
  {
    name: 'join_quiz',
    description: 'Join quiz sessions as participant',
    resource: 'session',
    action: 'join',
  },
  {
    name: 'manage_session',
    description: 'Manage quiz sessions (start, pause, resume)',
    resource: 'session',
    action: 'manage',
  },
  {
    name: 'manage_users',
    description: 'Manage user accounts and roles',
    resource: 'user',
    action: 'manage',
  },
  {
    name: 'view_users',
    description: 'View user information',
    resource: 'user',
    action: 'view',
  },
  {
    name: 'process_payment',
    description: 'Process payment transactions',
    resource: 'payment',
    action: 'process',
  },
  {
    name: 'view_revenue',
    description: 'View revenue and financial reports',
    resource: 'revenue',
    action: 'view',
  },
  {
    name: 'manage_payouts',
    description: 'Manage payout operations',
    resource: 'payout',
    action: 'manage',
  },
  {
    name: 'configure_gateways',
    description: 'Configure payment gateway settings',
    resource: 'gateway',
    action: 'configure',
  },
  {
    name: 'view_audit_logs',
    description: 'View audit logs and security events',
    resource: 'audit',
    action: 'view',
  },
];

// Role definitions with permission mappings
const ROLES = [
  {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Full system access with all permissions',
    isAdmin: true,
    priority: 100,
    permissions: [], // Admin gets all permissions automatically
  },
  {
    name: 'host',
    displayName: 'Quiz Host',
    description: 'Can create and manage quizzes, view revenue',
    isAdmin: false,
    priority: 50,
    permissionNames: [
      'create_quiz',
      'manage_quiz',
      'delete_quiz',
      'view_quiz',
      'join_quiz',
      'manage_session',
      'process_payment',
      'view_revenue',
    ],
  },
  {
    name: 'participant',
    displayName: 'Participant',
    description: 'Can join and participate in quizzes',
    isAdmin: false,
    priority: 10,
    permissionNames: [
      'view_quiz',
      'join_quiz',
    ],
  },
];

/**
 * Seed permissions into database
 */
async function seedPermissions() {
  logger.info('Seeding permissions...');

  const createdPermissions = [];

  for (const permData of PERMISSIONS) {
    try {
      const permission = await Permission.findOneAndUpdate(
        { name: permData.name },
        permData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      createdPermissions.push(permission);
      logger.info(`✓ Permission: ${permission.name}`);
    } catch (error) {
      logger.error(`✗ Failed to create permission: ${permData.name}`, { error: error.message });
    }
  }

  logger.info(`Seeded ${createdPermissions.length} permissions`);
  return createdPermissions;
}

/**
 * Seed roles into database
 */
async function seedRoles(permissions) {
  logger.info('Seeding roles...');

  // Create permission lookup map
  const permissionMap = new Map();
  permissions.forEach(p => permissionMap.set(p.name, p._id));

  const createdRoles = [];

  for (const roleData of ROLES) {
    try {
      // Map permission names to IDs
      const permissionIds = roleData.permissionNames
        ? roleData.permissionNames.map(name => permissionMap.get(name)).filter(Boolean)
        : [];

      const role = await Role.findOneAndUpdate(
        { name: roleData.name },
        {
          name: roleData.name,
          displayName: roleData.displayName,
          description: roleData.description,
          isAdmin: roleData.isAdmin,
          priority: roleData.priority,
          permissions: permissionIds,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      createdRoles.push(role);
      logger.info(`✓ Role: ${role.name} (${permissionIds.length} permissions)`);
    } catch (error) {
      logger.error(`✗ Failed to create role: ${roleData.name}`, { error: error.message });
    }
  }

  logger.info(`Seeded ${createdRoles.length} roles`);
  return createdRoles;
}

/**
 * Seed users into database
 * Requirements: 7.5 (Role assignment)
 */
async function seedUsers(roles) {
  logger.info('Seeding users...');
  
  const roleMap = new Map();
  roles.forEach(r => roleMap.set(r.name, r._id));
  
  const createdUsers = [];
  
  for (const userData of Users) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const roleId = roleMap.get(userData.role);
      
      const user = await User.findOneAndUpdate(
        { email: userData.email.toLowerCase() },
        {
          name: userData.name,
          email: userData.email.toLowerCase(),
          password: hashedPassword,
          role: userData.role,
          roles: roleId ? [roleId] : [],
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      
      createdUsers.push(user);
      logger.info(`✓ User: ${user.email} (${user.role})`);
    } catch (error) {
      logger.error(`✗ Failed to create user: ${userData.email}`, { error: error.message });
    }
  }
  
  logger.info(`Seeded ${createdUsers.length} users`);
  return createdUsers;
}

/**
 * Main seeding function
 */
async function seedRBAC() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/quiz-bolt';
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    // Seed permissions first
    const permissions = await seedPermissions();

    // Then seed roles with permission references
    const roles = await seedRoles(permissions);
    
    // Finally seed users with role references
    const users = await seedUsers(roles);

    // Seed subscriptions for creator and teams accounts
    await seedSubscriptions(users);

    logger.info('✓ RBAC & User seeding completed successfully');
    logger.info(`  - ${permissions.length} permissions`);
    logger.info(`  - ${roles.length} roles`);
    logger.info(`  - ${users.length} users`);

  } catch (error) {
    logger.error('RBAC seeding failed', { error: error.message, stack: error.stack });
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    logger.info('Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  seedRBAC()
    .then(() => process.exit(0))
    .catch(error => {
      logger.error('Unhandled error', { error: error.message });
      process.exit(1);
    });
}

/**
 * Seed subscriptions for test users
 */
async function seedSubscriptions(users) {
  logger.info('Seeding subscriptions for test users...');
  
  const lifetimeDate = new Date();
  lifetimeDate.setFullYear(lifetimeDate.getFullYear() + 10); // 10 years for "lifetime"

  const subMappings = [
    { email: 'creator@quvolt.com', plan: 'CREATOR' },
    { email: 'teams@quvolt.com', plan: 'TEAMS' }
  ];

  for (const mapping of subMappings) {
    const user = users.find(u => u.email === mapping.email);
    if (!user) {
      logger.warn(`User ${mapping.email} not found for subscription seeding`);
      continue;
    }

    const config = getPlanConfig(mapping.plan);
    
    try {
      await Subscription.findOneAndUpdate(
        { hostId: user._id },
        {
          hostId: user._id,
          plan: mapping.plan,
          status: 'active',
          startDate: new Date(),
          endDate: lifetimeDate,
          expiryDate: lifetimeDate,
          participantLimit: config.participants,
          commission: config.commission,
          monthlyAmount: config.monthlyAmount,
          autoRenew: true
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      logger.info(`✓ Subscription: ${mapping.plan} for ${user.email}`);
    } catch (error) {
      logger.error(`✗ Failed to seed subscription for ${user.email}`, { error: error.message });
    }
  }
}

module.exports = { seedRBAC, seedPermissions, seedRoles, seedUsers, seedSubscriptions };
