const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');
const rbacService = require('../services/rbac/rbac.service');
const auditLogService = require('../services/rbac/auditLog.service');
const permissionRevocationService = require('../services/rbac/permissionRevocation.service');
const User = require('../models/User');
const Role = require('../models/Role');
const logger = require('../utils/logger');

/**
 * RBAC Management Routes
 * Provides endpoints for managing roles, permissions, and access control
 * Requirements: 7.2, 10.6, 15
 */

/**
 * @route   POST /api/rbac/revoke-permission
 * @desc    Revoke permission from user and disconnect from active sessions
 * @access  Admin only
 * @body    { userId, permission, reason }
 */
router.post('/revoke-permission', protect, async (req, res) => {
  try {
    // Only admins can revoke permissions
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can revoke permissions',
      });
    }

    const { userId, permission, reason } = req.body;

    if (!userId || !permission) {
      return res.status(400).json({
        success: false,
        message: 'userId and permission are required',
      });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Publish revocation event (will trigger disconnection)
    await permissionRevocationService.revokePermission(
      userId,
      permission,
      reason || 'Permission revoked by administrator'
    );

    // Invalidate RBAC cache
    await rbacService.invalidateUserCache(userId);

    logger.info('Permission revoked via API', {
      adminId: req.user._id,
      userId,
      permission,
      reason,
    });

    res.json({
      success: true,
      message: 'Permission revoked and user disconnected from active sessions',
      data: {
        userId,
        permission,
        reason: reason || 'Permission revoked by administrator',
      },
    });
  } catch (error) {
    logger.error('Error revoking permission', {
      error: error.message,
      userId: req.body.userId,
      permission: req.body.permission,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to revoke permission',
    });
  }
});

/**
 * @route   POST /api/rbac/revoke-role
 * @desc    Revoke role from user and disconnect from active sessions
 * @access  Admin only
 * @body    { userId, roleId, reason }
 */
router.post('/revoke-role', protect, async (req, res) => {
  try {
    // Only admins can revoke roles
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can revoke roles',
      });
    }

    const { userId, roleId, reason } = req.body;

    if (!userId || !roleId) {
      return res.status(400).json({
        success: false,
        message: 'userId and roleId are required',
      });
    }

    // Verify user exists
    const user = await User.findById(userId).populate('roles');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    // Remove role from user
    user.roles = user.roles.filter(r => r._id.toString() !== roleId);
    await user.save();

    // Revoke role and disconnect user
    await permissionRevocationService.revokeUserRole(
      userId,
      role.name,
      reason || `Role ${role.displayName} revoked by administrator`
    );

    logger.info('Role revoked via API', {
      adminId: req.user._id,
      userId,
      roleId,
      roleName: role.name,
      reason,
    });

    res.json({
      success: true,
      message: 'Role revoked and user disconnected from active sessions',
      data: {
        userId,
        roleId,
        roleName: role.name,
        reason: reason || `Role ${role.displayName} revoked by administrator`,
      },
    });
  } catch (error) {
    logger.error('Error revoking role', {
      error: error.message,
      userId: req.body.userId,
      roleId: req.body.roleId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to revoke role',
    });
  }
});

/**
 * @route   GET /api/rbac/user/:userId/connections
 * @desc    Get active socket connections for a user
 * @access  Admin only
 */
router.get('/user/:userId/connections', protect, async (req, res) => {
  try {
    // Only admins can view user connections
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can view user connections',
      });
    }

    const { userId } = req.params;

    // Verify user exists
    const user = await User.findById(userId).select('name email role');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get active connections
    const socketIds = await permissionRevocationService.getUserConnections(userId);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        activeConnections: socketIds.length,
        socketIds,
      },
    });
  } catch (error) {
    logger.error('Error getting user connections', {
      error: error.message,
      userId: req.params.userId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get user connections',
    });
  }
});

/**
 * @route   GET /api/rbac/user/:userId/permissions
 * @desc    Get effective permissions for a user
 * @access  Admin or self
 */
router.get('/user/:userId/permissions', protect, async (req, res) => {
  try {
    const { userId } = req.params;

    // Users can view their own permissions, admins can view any user's permissions
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only view your own permissions',
      });
    }

    // Get user permissions
    const permissions = await rbacService.getUserPermissions(userId);

    res.json({
      success: true,
      data: {
        userId,
        permissions: permissions.map(p => ({
          id: p._id,
          name: p.name,
          description: p.description,
          resource: p.resource,
          action: p.action,
        })),
      },
    });
  } catch (error) {
    logger.error('Error getting user permissions', {
      error: error.message,
      userId: req.params.userId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get user permissions',
    });
  }
});

/**
 * @route   GET /api/rbac/audit-logs
 * @desc    Query audit logs with filtering and pagination
 * @access  Admin only
 * Requirements: 9.4, 9.7
 */
router.get('/audit-logs', protect, async (req, res) => {
  try {
    // Only admins can view audit logs
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can view audit logs',
      });
    }

    const {
      userId,
      resourceType,
      resourceId,
      result,
      startDate,
      endDate,
      suspiciousOnly,
      page,
      limit,
    } = req.query;

    const filters = {
      userId,
      resourceType,
      resourceId,
      result,
      startDate,
      endDate,
      suspiciousOnly: suspiciousOnly === 'true',
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
    };

    const result_data = await auditLogService.queryLogs(filters);

    res.status(200).json({
      success: true,
      data: result_data,
      message: 'Audit logs retrieved successfully',
    });
  } catch (error) {
    logger.error('Error querying audit logs', {
      error: error.message,
      userId: req.user._id,
    });

    res.status(500).json({
      success: false,
      data: null,
      message: 'Failed to retrieve audit logs',
    });
  }
});

/**
 * @route   GET /api/rbac/audit-logs/suspicious
 * @desc    Get suspicious activity summary
 * @access  Admin only
 * Requirement: 9.6
 */
router.get('/audit-logs/suspicious', protect, async (req, res) => {
  try {
    // Only admins can view suspicious activity
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can view suspicious activity',
      });
    }

    const { startDate, endDate } = req.query;

    const suspiciousActivity = await auditLogService.getSuspiciousActivity(
      startDate,
      endDate
    );

    res.status(200).json({
      success: true,
      data: suspiciousActivity,
      message: 'Suspicious activity retrieved successfully',
    });
  } catch (error) {
    logger.error('Error retrieving suspicious activity', {
      error: error.message,
      userId: req.user._id,
    });

    res.status(500).json({
      success: false,
      data: null,
      message: 'Failed to retrieve suspicious activity',
    });
  }
});

module.exports = router;

/**
 * Role Management Endpoints
 * Requirements: 15.1, 15.2, 15.7
 */

/**
 * @route   POST /api/rbac/roles
 * @desc    Create a new role
 * @access  Admin only
 * Requirement: 15.1
 */
router.post('/roles', protect, async (req, res) => {
  try {
    // Only admins can create roles
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can create roles',
      });
    }

    const { name, displayName, description, permissions, isAdmin } = req.body;

    if (!name || !displayName) {
      return res.status(400).json({
        success: false,
        message: 'name and displayName are required',
      });
    }

    // Check if role already exists
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'Role with this name already exists',
      });
    }

    // Create new role
    const role = new Role({
      name,
      displayName,
      description,
      permissions: permissions || [],
      isAdmin: isAdmin || false,
    });

    await role.save();

    logger.info('Role created', {
      adminId: req.user._id,
      roleId: role._id,
      roleName: role.name,
    });

    res.status(201).json({
      success: true,
      data: role,
      message: 'Role created successfully',
    });
  } catch (error) {
    logger.error('Error creating role', {
      error: error.message,
      adminId: req.user._id,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to create role',
    });
  }
});

/**
 * @route   PUT /api/rbac/roles/:roleId
 * @desc    Update an existing role
 * @access  Admin only
 * Requirement: 15.1
 */
router.put('/roles/:roleId', protect, async (req, res) => {
  try {
    // Only admins can update roles
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can update roles',
      });
    }

    const { roleId } = req.params;
    const { displayName, description, permissions, isAdmin } = req.body;

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    // Update role fields
    if (displayName) role.displayName = displayName;
    if (description !== undefined) role.description = description;
    if (permissions) role.permissions = permissions;
    if (isAdmin !== undefined) role.isAdmin = isAdmin;

    await role.save();

    // Invalidate cache for all users with this role
    const usersWithRole = await User.find({ roles: roleId });
    for (const user of usersWithRole) {
      await rbacService.invalidateUserCache(user._id);
    }

    logger.info('Role updated', {
      adminId: req.user._id,
      roleId: role._id,
      roleName: role.name,
    });

    res.json({
      success: true,
      data: role,
      message: 'Role updated successfully',
    });
  } catch (error) {
    logger.error('Error updating role', {
      error: error.message,
      roleId: req.params.roleId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to update role',
    });
  }
});

/**
 * @route   DELETE /api/rbac/roles/:roleId
 * @desc    Delete a role
 * @access  Admin only
 * Requirement: 15.1
 */
router.delete('/roles/:roleId', protect, async (req, res) => {
  try {
    // Only admins can delete roles
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can delete roles',
      });
    }

    const { roleId } = req.params;

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    // Find users with this role
    const usersWithRole = await User.find({ roles: roleId });

    // Get default participant role
    const defaultRole = await Role.findOne({ name: 'participant' });
    if (!defaultRole) {
      return res.status(500).json({
        success: false,
        message: 'Default role not found. Cannot delete role.',
      });
    }

    // Reassign users to default role (Requirement 15.4)
    for (const user of usersWithRole) {
      user.roles = user.roles.filter(r => r.toString() !== roleId);
      if (user.roles.length === 0) {
        user.roles.push(defaultRole._id);
      }
      await user.save();
      await rbacService.invalidateUserCache(user._id);
    }

    // Delete the role
    await Role.findByIdAndDelete(roleId);

    logger.info('Role deleted', {
      adminId: req.user._id,
      roleId,
      roleName: role.name,
      affectedUsers: usersWithRole.length,
    });

    res.json({
      success: true,
      message: 'Role deleted successfully',
      data: {
        roleId,
        roleName: role.name,
        affectedUsers: usersWithRole.length,
      },
    });
  } catch (error) {
    logger.error('Error deleting role', {
      error: error.message,
      roleId: req.params.roleId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to delete role',
    });
  }
});

/**
 * @route   GET /api/rbac/roles
 * @desc    List all roles
 * @access  Admin only
 * Requirement: 15.7
 */
router.get('/roles', protect, async (req, res) => {
  try {
    // Only admins can list all roles
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can list roles',
      });
    }

    const roles = await Role.find().populate('permissions');

    res.json({
      success: true,
      data: roles,
      message: 'Roles retrieved successfully',
    });
  } catch (error) {
    logger.error('Error listing roles', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to list roles',
    });
  }
});

/**
 * @route   POST /api/rbac/users/:userId/roles
 * @desc    Assign role to user
 * @access  Admin only
 * Requirement: 15.2
 */
router.post('/users/:userId/roles', protect, async (req, res) => {
  try {
    // Only admins can assign roles
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can assign roles',
      });
    }

    const { userId } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({
        success: false,
        message: 'roleId is required',
      });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    // Check if user already has this role
    if (user.roles && user.roles.some(r => r.toString() === roleId)) {
      return res.status(400).json({
        success: false,
        message: 'User already has this role',
      });
    }

    // Add role to user
    if (!user.roles) {
      user.roles = [];
    }
    user.roles.push(roleId);
    await user.save();

    // Invalidate RBAC cache
    await rbacService.invalidateUserCache(userId);

    logger.info('Role assigned to user', {
      adminId: req.user._id,
      userId,
      roleId,
      roleName: role.name,
    });

    res.json({
      success: true,
      message: 'Role assigned successfully',
      data: {
        userId,
        roleId,
        roleName: role.name,
      },
    });
  } catch (error) {
    logger.error('Error assigning role', {
      error: error.message,
      userId: req.params.userId,
      roleId: req.body.roleId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to assign role',
    });
  }
});

/**
 * @route   DELETE /api/rbac/users/:userId/roles/:roleId
 * @desc    Revoke role from user
 * @access  Admin only
 * Requirement: 15.2
 */
router.delete('/users/:userId/roles/:roleId', protect, async (req, res) => {
  try {
    // Only admins can revoke roles
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can revoke roles',
      });
    }

    const { userId, roleId } = req.params;

    // Verify user exists
    const user = await User.findById(userId).populate('roles');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    // Check if this is the last admin role (Requirement 15.3)
    if (role.isAdmin) {
      const adminCount = await User.countDocuments({
        roles: { $in: [roleId] },
      });

      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot revoke admin role: At least one admin user must exist',
        });
      }
    }

    // Remove role from user
    user.roles = user.roles.filter(r => r._id.toString() !== roleId);
    await user.save();

    // Invalidate RBAC cache
    await rbacService.invalidateUserCache(userId);

    logger.info('Role revoked from user', {
      adminId: req.user._id,
      userId,
      roleId,
      roleName: role.name,
    });

    res.json({
      success: true,
      message: 'Role revoked successfully',
      data: {
        userId,
        roleId,
        roleName: role.name,
      },
    });
  } catch (error) {
    logger.error('Error revoking role', {
      error: error.message,
      userId: req.params.userId,
      roleId: req.params.roleId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to revoke role',
    });
  }
});

/**
 * Permission Discovery Endpoints
 * Requirements: 15.5, 15.6
 */

/**
 * @route   GET /api/rbac/permissions
 * @desc    List all available permissions
 * @access  Admin only
 * Requirement: 15.5
 */
router.get('/permissions', protect, async (req, res) => {
  try {
    // Only admins can list all permissions
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can list permissions',
      });
    }

    const Permission = require('../models/Permission');
    const permissions = await Permission.find().sort({ resource: 1, action: 1 });

    res.json({
      success: true,
      data: permissions.map(p => ({
        id: p._id,
        name: p.name,
        description: p.description,
        resource: p.resource,
        action: p.action,
      })),
      message: 'Permissions retrieved successfully',
    });
  } catch (error) {
    logger.error('Error listing permissions', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to list permissions',
    });
  }
});

/**
 * @route   GET /api/rbac/users/:userId/effective-permissions
 * @desc    Get effective permissions for a user (combines all roles)
 * @access  Admin or self
 * Requirement: 15.6
 */
router.get('/users/:userId/effective-permissions', protect, async (req, res) => {
  try {
    const { userId } = req.params;

    // Users can view their own permissions, admins can view any user's permissions
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only view your own permissions',
      });
    }

    // Get user with roles and permissions
    const user = await User.findById(userId).populate({
      path: 'roles',
      populate: {
        path: 'permissions',
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Collect unique permissions from all roles
    const permissionMap = new Map();
    const roles = [];

    if (user.roles && user.roles.length > 0) {
      user.roles.forEach(role => {
        roles.push({
          id: role._id,
          name: role.name,
          displayName: role.displayName,
          isAdmin: role.isAdmin,
        });

        // If admin role, they have all permissions
        if (role.isAdmin) {
          permissionMap.set('*', {
            name: '*',
            description: 'All permissions (admin)',
            resource: '*',
            action: '*',
          });
        } else {
          role.permissions.forEach(permission => {
            permissionMap.set(permission._id.toString(), {
              id: permission._id,
              name: permission.name,
              description: permission.description,
              resource: permission.resource,
              action: permission.action,
            });
          });
        }
      });
    }

    const effectivePermissions = Array.from(permissionMap.values());

    res.json({
      success: true,
      data: {
        userId,
        userName: user.name,
        userEmail: user.email,
        roles,
        effectivePermissions,
        isAdmin: user.roles.some(r => r.isAdmin),
      },
      message: 'Effective permissions retrieved successfully',
    });
  } catch (error) {
    logger.error('Error getting effective permissions', {
      error: error.message,
      userId: req.params.userId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get effective permissions',
    });
  }
});
