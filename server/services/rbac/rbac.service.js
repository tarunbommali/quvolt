const User = require('../../models/User');
const Role = require('../../models/Role');
const Permission = require('../../models/Permission');
const { getRedisClient } = require('../../config/redis');
const logger = require('../../utils/logger');

/**
 * RBAC Service
 * Handles permission checks with caching and multi-role support
 * Requirements: 7.2, 7.5, 7.6, 7.7
 */
class RBACService {
  constructor() {
    this.CACHE_TTL = 300; // 5 minutes (Requirement 7.7)
    this.CACHE_PREFIX = 'rbac:permission:';
  }

  /**
   * Check if a user has a specific permission
   * Supports multiple roles with OR logic (Requirements 7.5, 7.6)
   * Uses Redis caching with 5-minute TTL (Requirement 7.7)
   * 
   * @param {string} userId - User ID to check
   * @param {string} permissionName - Permission name (e.g., 'create_quiz')
   * @param {string} resourceId - Optional resource ID for resource-level checks
   * @returns {Promise<boolean>} - True if user has permission
   */
  async checkPermission(userId, permissionName, resourceId = null) {
    try {
      // Generate cache key
      const cacheKey = this._getCacheKey(userId, permissionName, resourceId);
      
      // Check cache first (Requirement 7.7)
      const cached = await this._getFromCache(cacheKey);
      if (cached !== null) {
        logger.debug('RBAC cache hit', { userId, permissionName, resourceId });
        return cached === 'true';
      }

      // Fetch user with roles populated
      const user = await User.findById(userId).populate({
        path: 'roles',
        populate: {
          path: 'permissions',
        },
      });

      if (!user) {
        logger.warn('RBAC check failed: user not found', { userId, permissionName });
        await this._setCache(cacheKey, 'false');
        return false;
      }

      // If user has no roles, check legacy role field
      if (!user.roles || user.roles.length === 0) {
        logger.debug('User has no RBAC roles, checking legacy role field', { userId, role: user.role });
        // For backward compatibility, allow if legacy role matches permission context
        const hasLegacyPermission = await this._checkLegacyRole(user.role, permissionName);
        await this._setCache(cacheKey, hasLegacyPermission.toString());
        return hasLegacyPermission;
      }

      // Find the permission
      const permission = await Permission.findOne({ name: permissionName });
      if (!permission) {
        logger.warn('RBAC check failed: permission not found', { permissionName });
        await this._setCache(cacheKey, 'false');
        return false;
      }

      // Check if any role has the permission (OR logic - Requirement 7.6)
      // Admin role automatically has all permissions (Requirement 7.4)
      const hasPermission = user.roles.some(role => {
        if (role.isAdmin) {
          logger.debug('User has admin role, granting permission', { userId, permissionName });
          return true;
        }
        return role.permissions.some(p => p._id.toString() === permission._id.toString());
      });

      // Cache the result
      await this._setCache(cacheKey, hasPermission.toString());

      logger.debug('RBAC permission check', { 
        userId, 
        permissionName, 
        resourceId, 
        hasPermission,
        roles: user.roles.map(r => r.name),
      });

      return hasPermission;
    } catch (error) {
      logger.error('RBAC permission check error', { 
        error: error.message, 
        userId, 
        permissionName, 
        resourceId,
      });
      // Fail closed - deny permission on error
      return false;
    }
  }

  /**
   * Check multiple permissions at once
   * Returns true if user has ANY of the permissions (OR logic)
   */
  async checkAnyPermission(userId, permissionNames, resourceId = null) {
    const checks = await Promise.all(
      permissionNames.map(name => this.checkPermission(userId, name, resourceId))
    );
    return checks.some(result => result === true);
  }

  /**
   * Check multiple permissions at once
   * Returns true only if user has ALL permissions (AND logic)
   */
  async checkAllPermissions(userId, permissionNames, resourceId = null) {
    const checks = await Promise.all(
      permissionNames.map(name => this.checkPermission(userId, name, resourceId))
    );
    return checks.every(result => result === true);
  }

  /**
   * Get all effective permissions for a user
   * Combines permissions from all roles
   */
  async getUserPermissions(userId) {
    try {
      const user = await User.findById(userId).populate({
        path: 'roles',
        populate: {
          path: 'permissions',
        },
      });

      if (!user || !user.roles || user.roles.length === 0) {
        return [];
      }

      // If user has admin role, return all permissions
      const hasAdminRole = user.roles.some(role => role.isAdmin);
      if (hasAdminRole) {
        return await Permission.find({}).select('name description resource action');
      }

      // Collect unique permissions from all roles
      const permissionMap = new Map();
      user.roles.forEach(role => {
        role.permissions.forEach(permission => {
          permissionMap.set(permission._id.toString(), permission);
        });
      });

      return Array.from(permissionMap.values());
    } catch (error) {
      logger.error('Error getting user permissions', { error: error.message, userId });
      return [];
    }
  }

  /**
   * Invalidate permission cache for a user
   * Call this when user roles or permissions change
   */
  async invalidateUserCache(userId) {
    try {
      const redis = getRedisClient();
      const pattern = `${this.CACHE_PREFIX}${userId}:*`;
      
      // Scan and delete all keys matching the pattern
      let cursor = '0';
      let deletedCount = 0;
      
      do {
        const result = await redis.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });
        cursor = result.cursor;
        const keys = result.keys;
        
        if (keys.length > 0) {
          await redis.del(keys);
          deletedCount += keys.length;
        }
      } while (cursor !== '0');

      logger.info('Invalidated RBAC cache for user', { userId, deletedCount });
    } catch (error) {
      logger.error('Error invalidating RBAC cache', { error: error.message, userId });
    }
  }

  /**
   * Legacy role check for backward compatibility
   * Maps old role field to basic permissions
   */
  async _checkLegacyRole(role, permissionName) {
    // Admin has all permissions
    if (role === 'admin') return true;

    // Host permissions
    if (role === 'host') {
      return ['create_quiz', 'manage_quiz', 'view_revenue', 'process_payment'].includes(permissionName);
    }

    // Participant permissions
    if (role === 'participant') {
      return ['join_quiz', 'view_quiz'].includes(permissionName);
    }

    return false;
  }

  /**
   * Generate cache key for permission check
   */
  _getCacheKey(userId, permissionName, resourceId) {
    const base = `${this.CACHE_PREFIX}${userId}:${permissionName}`;
    return resourceId ? `${base}:${resourceId}` : base;
  }

  /**
   * Get value from Redis cache
   */
  async _getFromCache(key) {
    try {
      const redis = getRedisClient();
      return await redis.get(key);
    } catch (error) {
      logger.warn('Redis cache get error', { error: error.message, key });
      return null;
    }
  }

  /**
   * Set value in Redis cache with TTL
   */
  async _setCache(key, value) {
    try {
      const redis = getRedisClient();
      await redis.setEx(key, this.CACHE_TTL, value);
    } catch (error) {
      logger.warn('Redis cache set error', { error: error.message, key });
    }
  }
}

// Export singleton instance
module.exports = new RBACService();
