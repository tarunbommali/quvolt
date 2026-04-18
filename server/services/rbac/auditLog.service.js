const AuditLog = require('../../models/AuditLog');
const logger = require('../../utils/logger');

/**
 * Audit Log Service
 * Handles logging of permission checks and access attempts
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */
class AuditLogService {
  /**
   * Log a permission check failure
   * Requirement 9.1: Log all permission check failures
   * 
   * @param {Object} params - Audit log parameters
   * @param {string} params.userId - User ID
   * @param {string} params.resourceType - Type of resource
   * @param {string} params.resourceId - Resource ID
   * @param {string} params.action - Action attempted
   * @param {string} params.permission - Permission that was checked
   * @param {string} params.reason - Reason for denial
   * @param {string} params.correlationId - Request correlation ID
   * @param {string} params.ipAddress - IP address
   * @param {string} params.userAgent - User agent
   */
  async logPermissionDenied(params) {
    try {
      const {
        userId,
        resourceType,
        resourceId,
        action,
        permission,
        reason,
        correlationId,
        ipAddress,
        userAgent,
        metadata = {},
      } = params;

      const auditLog = new AuditLog({
        userId,
        resourceType,
        resourceId,
        action,
        result: 'denied',
        permission,
        reason,
        correlationId,
        ipAddress,
        userAgent,
        isSensitiveOperation: false,
        isSuspicious: false,
        metadata,
      });

      await auditLog.save();

      // Check for suspicious activity (Requirement 9.6)
      await this._checkSuspiciousActivity(userId, resourceType, action);

      logger.info('Permission denied logged', {
        userId,
        resourceType,
        resourceId,
        action,
        permission,
        correlationId,
      });
    } catch (error) {
      logger.error('Failed to log permission denial', {
        error: error.message,
        userId: params.userId,
        action: params.action,
      });
    }
  }

  /**
   * Log a successful sensitive operation
   * Requirement 9.2: Log successful access to sensitive operations
   * 
   * @param {Object} params - Audit log parameters
   */
  async logSensitiveOperation(params) {
    try {
      const {
        userId,
        resourceType,
        resourceId,
        action,
        permission,
        correlationId,
        ipAddress,
        userAgent,
        metadata = {},
      } = params;

      const auditLog = new AuditLog({
        userId,
        resourceType,
        resourceId,
        action,
        result: 'success',
        permission,
        correlationId,
        ipAddress,
        userAgent,
        isSensitiveOperation: true,
        isSuspicious: false,
        metadata,
      });

      await auditLog.save();

      logger.info('Sensitive operation logged', {
        userId,
        resourceType,
        resourceId,
        action,
        correlationId,
      });
    } catch (error) {
      logger.error('Failed to log sensitive operation', {
        error: error.message,
        userId: params.userId,
        action: params.action,
      });
    }
  }

  /**
   * Log a general access attempt
   * 
   * @param {Object} params - Audit log parameters
   */
  async logAccess(params) {
    try {
      const {
        userId,
        resourceType,
        resourceId,
        action,
        result,
        permission,
        reason,
        correlationId,
        ipAddress,
        userAgent,
        isSensitiveOperation = false,
        metadata = {},
      } = params;

      const auditLog = new AuditLog({
        userId,
        resourceType,
        resourceId,
        action,
        result,
        permission,
        reason,
        correlationId,
        ipAddress,
        userAgent,
        isSensitiveOperation,
        isSuspicious: false,
        metadata,
      });

      await auditLog.save();

      logger.debug('Access logged', {
        userId,
        resourceType,
        action,
        result,
        correlationId,
      });
    } catch (error) {
      logger.error('Failed to log access', {
        error: error.message,
        userId: params.userId,
        action: params.action,
      });
    }
  }

  /**
   * Query audit logs with filtering
   * Requirement 9.4: Support filtering by user, resource type, and time range
   * 
   * @param {Object} filters - Query filters
   * @param {string} filters.userId - Filter by user ID
   * @param {string} filters.resourceType - Filter by resource type
   * @param {string} filters.result - Filter by result (success/denied/error)
   * @param {Date} filters.startDate - Start date for time range
   * @param {Date} filters.endDate - End date for time range
   * @param {boolean} filters.suspiciousOnly - Only return suspicious activity
   * @param {number} filters.page - Page number (default: 1)
   * @param {number} filters.limit - Results per page (default: 50)
   * @returns {Promise<{logs: Array, total: number, page: number, pages: number}>}
   */
  async queryLogs(filters = {}) {
    try {
      const {
        userId,
        resourceType,
        resourceId,
        result,
        startDate,
        endDate,
        suspiciousOnly = false,
        page = 1,
        limit = 50,
      } = filters;

      // Build query
      const query = {};

      if (userId) {
        query.userId = userId;
      }

      if (resourceType) {
        query.resourceType = resourceType;
      }

      if (resourceId) {
        query.resourceId = resourceId;
      }

      if (result) {
        query.result = result;
      }

      if (suspiciousOnly) {
        query.isSuspicious = true;
      }

      // Time range filter
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          query.createdAt.$lte = new Date(endDate);
        }
      }

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        AuditLog.countDocuments(query),
      ]);

      const pages = Math.ceil(total / limit);

      return {
        logs,
        total,
        page,
        pages,
      };
    } catch (error) {
      logger.error('Failed to query audit logs', {
        error: error.message,
        filters,
      });
      throw error;
    }
  }

  /**
   * Check for suspicious activity patterns
   * Requirement 9.6: Flag suspicious access patterns
   * 
   * @param {string} userId - User ID to check
   * @param {string} resourceType - Resource type
   * @param {string} action - Action attempted
   */
  async _checkSuspiciousActivity(userId, resourceType, action) {
    try {
      // Check for repeated failures in the last 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      const recentFailures = await AuditLog.countDocuments({
        userId,
        result: 'denied',
        createdAt: { $gte: tenMinutesAgo },
      });

      // Flag as suspicious if more than 5 failures in 10 minutes
      if (recentFailures >= 5) {
        logger.warn('Suspicious activity detected: repeated permission failures', {
          userId,
          failureCount: recentFailures,
        });

        // Mark recent logs as suspicious
        await AuditLog.updateMany(
          {
            userId,
            result: 'denied',
            createdAt: { $gte: tenMinutesAgo },
            isSuspicious: false,
          },
          {
            $set: { isSuspicious: true },
          }
        );
      }
    } catch (error) {
      logger.error('Failed to check suspicious activity', {
        error: error.message,
        userId,
      });
    }
  }

  /**
   * Get suspicious activity summary
   * Requirement 9.6: Flag suspicious access patterns
   * 
   * @param {Date} startDate - Start date for analysis
   * @param {Date} endDate - End date for analysis
   * @returns {Promise<Array>} - Array of suspicious activity summaries
   */
  async getSuspiciousActivity(startDate, endDate) {
    try {
      const query = {
        isSuspicious: true,
      };

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          query.createdAt.$lte = new Date(endDate);
        }
      }

      const suspiciousLogs = await AuditLog.find(query)
        .sort({ createdAt: -1 })
        .lean();

      // Group by user
      const summary = {};
      suspiciousLogs.forEach(log => {
        const userId = log.userId?._id?.toString() || 'unknown';
        if (!summary[userId]) {
          summary[userId] = {
            user: log.userId,
            failureCount: 0,
            actions: new Set(),
            resources: new Set(),
            firstOccurrence: log.createdAt,
            lastOccurrence: log.createdAt,
          };
        }
        summary[userId].failureCount++;
        summary[userId].actions.add(log.action);
        summary[userId].resources.add(log.resourceType);
        if (log.createdAt < summary[userId].firstOccurrence) {
          summary[userId].firstOccurrence = log.createdAt;
        }
        if (log.createdAt > summary[userId].lastOccurrence) {
          summary[userId].lastOccurrence = log.createdAt;
        }
      });

      // Convert to array and format
      return Object.values(summary).map(item => ({
        user: item.user,
        failureCount: item.failureCount,
        actions: Array.from(item.actions),
        resources: Array.from(item.resources),
        firstOccurrence: item.firstOccurrence,
        lastOccurrence: item.lastOccurrence,
      }));
    } catch (error) {
      logger.error('Failed to get suspicious activity', {
        error: error.message,
      });
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new AuditLogService();
