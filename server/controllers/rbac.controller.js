const User = require('../models/User');
const Role = require('../models/Role');
const rbacService = require('../services/rbac/rbac.service');
const auditLogService = require('../services/rbac/auditLog.service');
const permissionRevocationService = require('../services/rbac/permissionRevocation.service');
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/responseHelper');

/**
 * Revoke permission from user and disconnect from active sessions
 */
const revokePermission = async (req, res) => {
    try {
        const { userId, permission, reason } = req.body;

        if (!userId || !permission) {
            return sendError(res, 'userId and permission are required', 400);
        }

        const user = await User.findById(userId);
        if (!user) return sendError(res, 'User not found', 404);

        await permissionRevocationService.revokePermission(
            userId,
            permission,
            reason || 'Permission revoked by administrator'
        );

        await rbacService.invalidateUserCache(userId);

        logger.info('Permission revoked via API', { adminId: req.user._id, userId, permission, reason });

        return sendSuccess(res, { userId, permission, reason: reason || 'Permission revoked by administrator' }, 'Permission revoked and user disconnected');
    } catch (error) {
        logger.error('Error revoking permission', { error: error.message, userId: req.body.userId });
        return sendError(res, 'Failed to revoke permission');
    }
};

/**
 * Revoke role from user and disconnect from active sessions
 */
const revokeRoleFromUser = async (req, res) => {
    try {
        const { userId, roleId } = req.params; // Supports DELETE /users/:userId/roles/:roleId
        const bodyRoleId = req.body.roleId;   // Supports POST /revoke-role
        const targetRoleId = roleId || bodyRoleId;
        const reason = req.body.reason;

        if (!userId || !targetRoleId) {
            return sendError(res, 'userId and roleId are required', 400);
        }

        const user = await User.findById(userId).populate('roles');
        if (!user) return sendError(res, 'User not found', 404);

        const role = await Role.findById(targetRoleId);
        if (!role) return sendError(res, 'Role not found', 404);

        // Check if this is the last admin role (Requirement 15.3)
        if (role.isAdmin) {
            const adminCount = await User.countDocuments({ roles: { $in: [targetRoleId] } });
            if (adminCount <= 1) {
                return sendError(res, 'Cannot revoke admin role: At least one admin user must exist', 400);
            }
        }

        user.roles = user.roles.filter(r => r._id.toString() !== targetRoleId);
        await user.save();

        await permissionRevocationService.revokeUserRole(
            userId,
            role.name,
            reason || `Role ${role.displayName} revoked by administrator`
        );

        await rbacService.invalidateUserCache(userId);

        logger.info('Role revoked via API', { adminId: req.user._id, userId, targetRoleId, roleName: role.name });

        return sendSuccess(res, { userId, roleId: targetRoleId, roleName: role.name }, 'Role revoked and user disconnected');
    } catch (error) {
        logger.error('Error revoking role', { error: error.message, userId: req.body.userId || req.params.userId });
        return sendError(res, 'Failed to revoke role');
    }
};

/**
 * Get active socket connections for a user
 */
const getUserConnections = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId).select('name email role');
        if (!user) return sendError(res, 'User not found', 404);

        const socketIds = await permissionRevocationService.getUserConnections(userId);

        return sendSuccess(res, {
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            activeConnections: socketIds.length,
            socketIds,
        });
    } catch (error) {
        logger.error('Error getting user connections', { error: error.message, userId: req.params.userId });
        return sendError(res, 'Failed to get user connections');
    }
};

/**
 * Get effective permissions for a user
 */
const getUserPermissions = async (req, res) => {
    try {
        const { userId } = req.params;

        // Security: non-admins can only see their own permissions
        if (req.user.role !== 'admin' && String(userId) !== String(req.user._id)) {
            return sendError(res, 'Forbidden: You can only view your own permissions', 403);
        }

        const permissions = await rbacService.getUserPermissions(userId);

        return sendSuccess(res, {
            userId,
            permissions: permissions.map(p => ({
                id: p._id,
                name: p.name,
                description: p.description,
                resource: p.resource,
                action: p.action,
            })),
        });
    } catch (error) {
        logger.error('Error getting user permissions', { error: error.message, userId: req.params.userId });
        return sendError(res, 'Failed to get user permissions');
    }
};

/**
 * Query audit logs
 */
const getAuditLogs = async (req, res) => {
    try {
        const {
            userId, resourceType, resourceId, result, startDate, endDate, suspiciousOnly, page, limit,
        } = req.query;

        const filters = {
            userId, resourceType, resourceId, result, startDate, endDate,
            suspiciousOnly: suspiciousOnly === 'true',
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 50,
        };

        const result_data = await auditLogService.queryLogs(filters);
        return sendSuccess(res, result_data, 'Audit logs retrieved successfully');
    } catch (error) {
        logger.error('Error querying audit logs', { error: error.message });
        return sendError(res, 'Failed to retrieve audit logs');
    }
};

/**
 * Get suspicious activity summary
 */
const getSuspiciousActivity = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const suspiciousActivity = await auditLogService.getSuspiciousActivity(startDate, endDate);
        return sendSuccess(res, suspiciousActivity, 'Suspicious activity retrieved successfully');
    } catch (error) {
        logger.error('Error retrieving suspicious activity', { error: error.message });
        return sendError(res, 'Failed to retrieve suspicious activity');
    }
};

/**
 * Create a new role
 */
const createRole = async (req, res) => {
    try {
        const { name, displayName, description, permissions, isAdmin } = req.body;

        if (!name || !displayName) return sendError(res, 'name and displayName are required', 400);

        const existingRole = await Role.findOne({ name });
        if (existingRole) return sendError(res, 'Role with this name already exists', 400);

        const role = new Role({
            name, displayName, description, 
            permissions: permissions || [],
            isAdmin: isAdmin || false,
        });

        await role.save();
        logger.info('Role created', { adminId: req.user._id, roleId: role._id, roleName: role.name });

        return sendSuccess(res, role, 'Role created successfully', 201);
    } catch (error) {
        logger.error('Error creating role', { error: error.message });
        return sendError(res, 'Failed to create role');
    }
};

/**
 * Update an existing role
 */
const updateRole = async (req, res) => {
    try {
        const { roleId } = req.params;
        const { displayName, description, permissions, isAdmin } = req.body;

        const role = await Role.findById(roleId);
        if (!role) return sendError(res, 'Role not found', 404);

        if (displayName) role.displayName = displayName;
        if (description !== undefined) role.description = description;
        if (permissions) role.permissions = permissions;
        if (isAdmin !== undefined) role.isAdmin = isAdmin;

        await role.save();

        // Invalidate cache for affected users
        const usersWithRole = await User.find({ roles: roleId });
        for (const user of usersWithRole) {
            await rbacService.invalidateUserCache(user._id);
        }

        return sendSuccess(res, role, 'Role updated successfully');
    } catch (error) {
        logger.error('Error updating role', { error: error.message, roleId: req.params.roleId });
        return sendError(res, 'Failed to update role');
    }
};

/**
 * Delete a role
 */
const deleteRole = async (req, res) => {
    try {
        const { roleId } = req.params;
        const role = await Role.findById(roleId);
        if (!role) return sendError(res, 'Role not found', 404);

        const usersWithRole = await User.find({ roles: roleId });
        const defaultRole = await Role.findOne({ name: 'participant' });
        
        if (!defaultRole) return sendError(res, 'Default role not found. Cannot delete.', 500);

        for (const user of usersWithRole) {
            user.roles = user.roles.filter(r => r.toString() !== roleId);
            if (user.roles.length === 0) user.roles.push(defaultRole._id);
            await user.save();
            await rbacService.invalidateUserCache(user._id);
        }

        await Role.findByIdAndDelete(roleId);
        return sendSuccess(res, { roleId, roleName: role.name, affectedUsers: usersWithRole.length }, 'Role deleted successfully');
    } catch (error) {
        logger.error('Error deleting role', { error: error.message, roleId: req.params.roleId });
        return sendError(res, 'Failed to delete role');
    }
};

/**
 * List all roles
 */
const listRoles = async (req, res) => {
    try {
        const roles = await Role.find().populate('permissions');
        return sendSuccess(res, roles, 'Roles retrieved successfully');
    } catch (error) {
        logger.error('Error listing roles', { error: error.message });
        return sendError(res, 'Failed to list roles');
    }
};

/**
 * Assign role to user
 */
const assignRoleToUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { roleId } = req.body;

        if (!roleId) return sendError(res, 'roleId is required', 400);

        const user = await User.findById(userId);
        if (!user) return sendError(res, 'User not found', 404);

        const role = await Role.findById(roleId);
        if (!role) return sendError(res, 'Role not found', 404);

        if (user.roles && user.roles.some(r => r.toString() === roleId)) {
            return sendError(res, 'User already has this role', 400);
        }

        if (!user.roles) user.roles = [];
        user.roles.push(roleId);
        await user.save();

        await rbacService.invalidateUserCache(userId);

        return sendSuccess(res, { userId, roleId, roleName: role.name }, 'Role assigned successfully');
    } catch (error) {
        logger.error('Error assigning role', { error: error.message, userId: req.params.userId });
        return sendError(res, 'Failed to assign role');
    }
};

module.exports = {
    revokePermission,
    revokeRoleFromUser,
    getUserConnections,
    getUserPermissions,
    getAuditLogs,
    getSuspiciousActivity,
    createRole,
    updateRole,
    deleteRole,
    listRoles,
    assignRoleToUser,
};
