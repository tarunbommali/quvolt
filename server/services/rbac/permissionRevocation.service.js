const { getRedisClient } = require('../../config/redis');
const logger = require('../../utils/logger');

/**
 * Permission Revocation Service
 * Handles real-time permission revocation and user disconnection
 * Requirement: 10.6 - Disconnect users from active sessions within 30 seconds when permissions revoked
 */
class PermissionRevocationService {
  constructor() {
    this.REVOCATION_CHANNEL = 'rbac:permission:revoked';
    this.CONNECTION_PREFIX = 'rbac:connections:';
    this.pubClient = null;
    this.subClient = null;
    this.io = null;
    this.initialized = false;
  }

  /**
   * Initialize the service with Socket.io instance
   * Sets up Redis pub/sub for permission revocation events
   * Falls back to in-memory mode if Redis is unavailable
   */
  async initialize(io) {
    if (this.initialized) {
      logger.warn('PermissionRevocationService already initialized');
      return;
    }

    this.io = io;

    try {
      // Create dedicated Redis clients for pub/sub
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      const { createClient } = require('redis');
      
      this.pubClient = createClient({ url: redisUrl });
      this.subClient = createClient({ url: redisUrl });

      await Promise.all([
        this.pubClient.connect(),
        this.subClient.connect(),
      ]);

      // Subscribe to permission revocation events
      await this.subClient.subscribe(this.REVOCATION_CHANNEL, (message) => {
        this._handleRevocationEvent(message);
      });

      this.initialized = true;
      logger.info('PermissionRevocationService initialized with Redis');
    } catch (error) {
      logger.warn('Failed to initialize PermissionRevocationService with Redis, falling back to in-memory mode', {
        error: error.message,
      });
      
      // Clean up failed connections
      try {
        if (this.pubClient) await this.pubClient.disconnect().catch(() => {});
        if (this.subClient) await this.subClient.disconnect().catch(() => {});
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      // Reset clients and use in-memory fallback
      this.pubClient = null;
      this.subClient = null;
      this.inMemoryConnections = new Map(); // userId -> Set of socketIds
      this.initialized = true;
      logger.info('PermissionRevocationService initialized in in-memory mode');
    }
  }

  /**
   * Register a socket connection for a user
   * Tracks active connections for permission revocation
   */
  async registerConnection(userId, socketId) {
    try {
      // Use in-memory fallback if Redis is not available
      if (!this.pubClient) {
        if (!this.inMemoryConnections.has(userId)) {
          this.inMemoryConnections.set(userId, new Set());
        }
        this.inMemoryConnections.get(userId).add(socketId);
        logger.debug('Registered socket connection (in-memory)', { userId, socketId });
        return;
      }

      const key = `${this.CONNECTION_PREFIX}${userId}`;
      const redis = getRedisClient();
      
      // Add socket ID to user's connection set with 24-hour expiry
      await redis.sAdd(key, socketId);
      await redis.expire(key, 86400); // 24 hours

      logger.debug('Registered socket connection', { userId, socketId });
    } catch (error) {
      logger.error('Failed to register socket connection', {
        error: error.message,
        userId,
        socketId,
      });
    }
  }

  /**
   * Unregister a socket connection for a user
   */
  async unregisterConnection(userId, socketId) {
    try {
      // Use in-memory fallback if Redis is not available
      if (!this.pubClient) {
        if (this.inMemoryConnections.has(userId)) {
          this.inMemoryConnections.get(userId).delete(socketId);
          if (this.inMemoryConnections.get(userId).size === 0) {
            this.inMemoryConnections.delete(userId);
          }
        }
        logger.debug('Unregistered socket connection (in-memory)', { userId, socketId });
        return;
      }

      const key = `${this.CONNECTION_PREFIX}${userId}`;
      const redis = getRedisClient();
      
      await redis.sRem(key, socketId);

      logger.debug('Unregistered socket connection', { userId, socketId });
    } catch (error) {
      logger.error('Failed to unregister socket connection', {
        error: error.message,
        userId,
        socketId,
      });
    }
  }

  /**
   * Get all active socket connections for a user
   */
  async getUserConnections(userId) {
    try {
      // Use in-memory fallback if Redis is not available
      if (!this.pubClient) {
        const connections = this.inMemoryConnections.get(userId);
        return connections ? Array.from(connections) : [];
      }

      const key = `${this.CONNECTION_PREFIX}${userId}`;
      const redis = getRedisClient();
      
      const socketIds = await redis.sMembers(key);
      return socketIds;
    } catch (error) {
      logger.error('Failed to get user connections', {
        error: error.message,
        userId,
      });
      return [];
    }
  }

  /**
   * Publish a permission revocation event
   * This will trigger disconnection of affected users
   * 
   * @param {string|string[]} userIds - User ID(s) whose permissions were revoked
   * @param {string} permission - Permission that was revoked
   * @param {string} reason - Reason for revocation
   */
  async revokePermission(userIds, permission, reason = 'Permission revoked') {
    try {
      if (!this.pubClient) {
        logger.warn('PermissionRevocationService not initialized, skipping revocation broadcast');
        return;
      }

      const userIdArray = Array.isArray(userIds) ? userIds : [userIds];
      
      const event = {
        userIds: userIdArray,
        permission,
        reason,
        timestamp: new Date().toISOString(),
      };

      await this.pubClient.publish(
        this.REVOCATION_CHANNEL,
        JSON.stringify(event)
      );

      logger.info('Published permission revocation event', {
        userIds: userIdArray,
        permission,
        reason,
      });
    } catch (error) {
      logger.error('Failed to publish permission revocation event', {
        error: error.message,
        userIds,
        permission,
      });
    }
  }

  /**
   * Handle permission revocation event from Redis pub/sub
   * Disconnects affected users from active sessions
   */
  async _handleRevocationEvent(message) {
    try {
      const event = JSON.parse(message);
      const { userIds, permission, reason } = event;

      logger.info('Processing permission revocation event', {
        userIds,
        permission,
        reason,
      });

      // Disconnect each affected user
      for (const userId of userIds) {
        await this._disconnectUser(userId, permission, reason);
      }
    } catch (error) {
      logger.error('Failed to handle revocation event', {
        error: error.message,
        message,
      });
    }
  }

  /**
   * Disconnect all active sessions for a user
   * Requirement: 10.6 - Complete disconnection within 30 seconds
   */
  async _disconnectUser(userId, permission, reason) {
    try {
      // Get all active socket connections for the user
      const socketIds = await this.getUserConnections(userId);

      if (socketIds.length === 0) {
        logger.debug('No active connections for user', { userId });
        return;
      }

      logger.info('Disconnecting user from active sessions', {
        userId,
        socketCount: socketIds.length,
        permission,
        reason,
      });

      // Disconnect each socket
      for (const socketId of socketIds) {
        const socket = this.io.sockets.sockets.get(socketId);
        
        if (socket) {
          // Emit permission revoked event to client
          socket.emit('permission_revoked', {
            permission,
            reason,
            message: 'Your permissions have been revoked. You have been disconnected from the session.',
          });

          // Disconnect the socket
          socket.disconnect(true);

          logger.info('Disconnected socket due to permission revocation', {
            userId,
            socketId,
            permission,
          });
        } else {
          // Socket no longer exists, clean up tracking
          await this.unregisterConnection(userId, socketId);
        }
      }

      // Clean up all connections for the user
      if (!this.pubClient) {
        // In-memory cleanup
        this.inMemoryConnections.delete(userId);
      } else {
        // Redis cleanup
        const key = `${this.CONNECTION_PREFIX}${userId}`;
        const redis = getRedisClient();
        await redis.del(key);
      }

      logger.info('User disconnected from all sessions', {
        userId,
        disconnectedSockets: socketIds.length,
      });
    } catch (error) {
      logger.error('Failed to disconnect user', {
        error: error.message,
        userId,
        permission,
      });
    }
  }

  /**
   * Revoke role from user and disconnect them
   * This is a convenience method that combines role revocation with disconnection
   */
  async revokeUserRole(userId, roleName, reason = 'Role revoked') {
    try {
      logger.info('Revoking user role', { userId, roleName, reason });

      // Publish revocation event with role context
      await this.revokePermission(
        userId,
        `role:${roleName}`,
        reason
      );

      // Invalidate RBAC cache for the user
      const rbacService = require('./rbac.service');
      await rbacService.invalidateUserCache(userId);

      logger.info('User role revoked and cache invalidated', { userId, roleName });
    } catch (error) {
      logger.error('Failed to revoke user role', {
        error: error.message,
        userId,
        roleName,
      });
      throw error;
    }
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async cleanup() {
    try {
      if (this.subClient) {
        await this.subClient.unsubscribe(this.REVOCATION_CHANNEL);
        await this.subClient.quit();
      }
      if (this.pubClient) {
        await this.pubClient.quit();
      }
      this.initialized = false;
      logger.info('PermissionRevocationService cleaned up');
    } catch (error) {
      logger.error('Error during PermissionRevocationService cleanup', {
        error: error.message,
      });
    }
  }
}

// Export singleton instance
module.exports = new PermissionRevocationService();
