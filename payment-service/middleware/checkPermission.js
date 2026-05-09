const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Import models from main server (they share the same database)
// We'll define minimal schemas here to avoid circular dependencies
const UserSchema = new mongoose.Schema({
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
  role: String, // Legacy role field
}, { collection: 'users' });

const RoleSchema = new mongoose.Schema({
  name: String,
  permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
  isAdmin: Boolean,
}, { collection: 'roles' });

const PermissionSchema = new mongoose.Schema({
  name: String,
  description: String,
  resource: String,
  action: String,
}, { collection: 'permissions' });

// Use existing models if already defined, otherwise create new ones
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Role = mongoose.models.Role || mongoose.model('Role', RoleSchema);
const Permission = mongoose.models.Permission || mongoose.model('Permission', PermissionSchema);

/**
 * Simple RBAC permission checker for payment service
 * Requirements: 7.2, 7.3, 11.1, 11.2, 11.3
 */
class PaymentRBACService {
  /**
   * Check if a user has a specific permission
   * Simplified version without caching for payment service
   */
  async checkPermission(userId, permissionName) {
    try {
      const user = await User.findById(userId).populate({
        path: 'roles',
        populate: {
          path: 'permissions',
        },
      });

      if (!user) {
        logger.warn('RBAC check failed: user not found', { userId, permissionName });
        return false;
      }

      // If user has no roles, check legacy role field
      if (!user.roles || user.roles.length === 0) {
        return this._checkLegacyRole(user.role, permissionName);
      }

      const permission = await Permission.findOne({ name: permissionName });
      if (!permission) {
        logger.warn('RBAC check failed: permission not found', { permissionName });
        return false;
      }

      // Check if any role has the permission (OR logic)
      // Admin role automatically has all permissions
      const hasPermission = user.roles.some(role => {
        if (role.isAdmin) {
          return true;
        }
        return role.permissions.some(p => p._id.toString() === permission._id.toString());
      });

      return hasPermission;
    } catch (error) {
      logger.error('RBAC permission check error', { 
        error: error.message, 
        userId, 
        permissionName,
      });
      return false;
    }
  }

  /**
   * Legacy role check for backward compatibility
   */
  _checkLegacyRole(role, permissionName) {
    if (role === 'admin') return true;

    if (role === 'host') {
      return ['process_payment', 'view_revenue', 'manage_payouts', 'manage_session'].includes(permissionName);
    }

    return false;
  }
}

const rbacService = new PaymentRBACService();

/**
 * Middleware to check if user has required permission
 * Requirements: 7.2, 7.3
 * 
 * @param {string} permissionName - Required permission name
 * @returns {Function} Express middleware
 */
const checkPermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user._id) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authorized, user not authenticated',
          },
        });
      }

      const hasPermission = await rbacService.checkPermission(
        req.user._id,
        permissionName
      );

      // Requirement 7.3: Return 403 Forbidden when permission denied
      if (!hasPermission) {
        logger.warn('Permission denied', {
          userId: req.user._id,
          permission: permissionName,
          path: req.path,
          method: req.method,
        });

        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: `Forbidden: You do not have permission to perform this action (${permissionName})`,
          },
        });
      }

      next();
    } catch (error) {
      logger.error('Permission check error', {
        error: error.message,
        userId: req.user?._id,
        permission: permissionName,
        path: req.path,
      });

      return res.status(500).json({
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error during permission check',
        },
      });
    }
  };
};

/**
 * Middleware to check resource ownership for revenue data
 * Requirements: 11.4, 11.5
 * Ensures users can only view their own revenue data unless they're admin
 */
const checkRevenueOwnership = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authorized, user not authenticated',
        },
      });
    }

    // Admin can view all revenue data (Requirement 11.4)
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user has admin permission via RBAC
    const hasAdminPermission = await rbacService.checkPermission(req.user._id, 'manage_users');
    if (hasAdminPermission) {
      return next();
    }

    // Extract target user ID from request
    const targetUserId = req.body?.hostId || req.params?.userId || req.query?.hostId;

    // If no target user specified, allow (will default to current user in controller)
    if (!targetUserId) {
      return next();
    }

    // Requirement 11.5: Hosts can only view their own revenue data
    if (String(targetUserId) !== String(req.user._id)) {
      logger.warn('Revenue ownership check failed', {
        userId: req.user._id,
        targetUserId,
        path: req.path,
      });

      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Forbidden: You can only view your own revenue data',
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Revenue ownership check error', {
      error: error.message,
      userId: req.user?._id,
      path: req.path,
    });

    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Internal server error during ownership check',
      },
    });
  }
};

module.exports = {
  checkPermission,
  checkRevenueOwnership,
};
