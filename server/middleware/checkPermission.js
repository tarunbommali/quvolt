const rbacService = require('../services/rbac/rbac.service');
const auditLogService = require('../services/rbac/auditLog.service');
const logger = require('../utils/logger');

/**
 * Middleware to check if user has required permission
 * Requirements: 7.2, 7.3
 * 
 * @param {string} permissionName - Required permission name (e.g., 'create_quiz')
 * @param {Object} options - Optional configuration
 * @param {Function} options.getResourceId - Function to extract resource ID from request
 * @returns {Function} Express middleware
 */
const checkPermission = (permissionName, options = {}) => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated (should be set by protect middleware)
      if (!req.user || !req.user._id) {
        return res.status(401).json({
          success: false,
          data: null,
          message: 'Not authorized, user not authenticated',
        });
      }

      // Extract resource ID if getter function provided
      const resourceId = options.getResourceId ? options.getResourceId(req) : null;

      // Check permission using RBAC service
      const hasPermission = await rbacService.checkPermission(
        req.user._id,
        permissionName,
        resourceId
      );

      // Requirement 7.3: Return 403 Forbidden when permission denied
      if (!hasPermission) {
        logger.warn('Permission denied', {
          userId: req.user._id,
          permission: permissionName,
          resourceId,
          path: req.path,
          method: req.method,
        });

        // Requirement 9.1: Log permission check failures
        await auditLogService.logPermissionDenied({
          userId: req.user._id,
          resourceType: options.resourceType || 'unknown',
          resourceId,
          action: `${req.method} ${req.path}`,
          permission: permissionName,
          reason: 'Permission denied',
          correlationId: req.requestId,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
        });

        return res.status(403).json({
          success: false,
          data: null,
          message: `Forbidden: You do not have permission to perform this action (${permissionName})`,
        });
      }

      // Permission granted, proceed to next middleware
      logger.debug('Permission granted', {
        userId: req.user._id,
        permission: permissionName,
        resourceId,
      });

      next();
    } catch (error) {
      logger.error('Permission check error', {
        error: error.message,
        userId: req.user?._id,
        permission: permissionName,
        path: req.path,
      });

      return res.status(500).json({
        success: false,
        data: null,
        message: 'Internal server error during permission check',
      });
    }
  };
};

/**
 * Middleware to check if user has any of the specified permissions
 * Useful for routes that accept multiple permission types
 * 
 * @param {string[]} permissionNames - Array of permission names
 * @param {Object} options - Optional configuration
 * @returns {Function} Express middleware
 */
const checkAnyPermission = (permissionNames, options = {}) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user._id) {
        return res.status(401).json({
          success: false,
          data: null,
          message: 'Not authorized, user not authenticated',
        });
      }

      const resourceId = options.getResourceId ? options.getResourceId(req) : null;

      const hasPermission = await rbacService.checkAnyPermission(
        req.user._id,
        permissionNames,
        resourceId
      );

      if (!hasPermission) {
        logger.warn('Permission denied (any check)', {
          userId: req.user._id,
          permissions: permissionNames,
          resourceId,
          path: req.path,
        });

        return res.status(403).json({
          success: false,
          data: null,
          message: `Forbidden: You do not have any of the required permissions`,
        });
      }

      next();
    } catch (error) {
      logger.error('Permission check error (any)', {
        error: error.message,
        userId: req.user?._id,
        permissions: permissionNames,
      });

      return res.status(500).json({
        success: false,
        data: null,
        message: 'Internal server error during permission check',
      });
    }
  };
};

/**
 * Middleware to check if user has all of the specified permissions
 * Useful for routes that require multiple permissions
 * 
 * @param {string[]} permissionNames - Array of permission names
 * @param {Object} options - Optional configuration
 * @returns {Function} Express middleware
 */
const checkAllPermissions = (permissionNames, options = {}) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user._id) {
        return res.status(401).json({
          success: false,
          data: null,
          message: 'Not authorized, user not authenticated',
        });
      }

      const resourceId = options.getResourceId ? options.getResourceId(req) : null;

      const hasPermission = await rbacService.checkAllPermissions(
        req.user._id,
        permissionNames,
        resourceId
      );

      if (!hasPermission) {
        logger.warn('Permission denied (all check)', {
          userId: req.user._id,
          permissions: permissionNames,
          resourceId,
          path: req.path,
        });

        return res.status(403).json({
          success: false,
          data: null,
          message: `Forbidden: You do not have all required permissions`,
        });
      }

      next();
    } catch (error) {
      logger.error('Permission check error (all)', {
        error: error.message,
        userId: req.user?._id,
        permissions: permissionNames,
      });

      return res.status(500).json({
        success: false,
        data: null,
        message: 'Internal server error during permission check',
      });
    }
  };
};

/**
 * Middleware to log sensitive operations
 * Requirement 9.2: Log successful access to sensitive operations
 * 
 * @param {string} action - Description of the sensitive action
 * @param {Object} options - Optional configuration
 * @returns {Function} Express middleware
 */
const logSensitiveOperation = (action, options = {}) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user._id) {
        return next();
      }

      const resourceId = options.getResourceId ? options.getResourceId(req) : null;

      // Log the sensitive operation
      await auditLogService.logSensitiveOperation({
        userId: req.user._id,
        resourceType: options.resourceType || 'unknown',
        resourceId,
        action,
        permission: options.permission,
        correlationId: req.requestId,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        metadata: options.getMetadata ? options.getMetadata(req) : {},
      });

      next();
    } catch (error) {
      logger.error('Error logging sensitive operation', {
        error: error.message,
        userId: req.user?._id,
        action,
      });
      // Don't block the request if logging fails
      next();
    }
  };
};

module.exports = {
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  logSensitiveOperation,
};
