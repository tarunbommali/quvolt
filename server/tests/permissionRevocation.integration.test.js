/**
 * Permission Revocation Integration Tests
 * Tests real-time permission revocation and session disconnection
 * Requirement: 10.6 - Disconnect users from active sessions within 30 seconds when permissions revoked
 * Task: 15.3 - Implement real-time permission revocation
 */

const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const jwt = require('jsonwebtoken');
const permissionRevocationService = require('../services/rbac/permissionRevocation.service');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

// Mock dependencies
jest.mock('../config/redis');
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('Permission Revocation Integration Tests', () => {
  let io;
  let serverSocket;
  let clientSocket;
  let httpServer;
  let httpServerAddr;
  let mockRedisClient;
  let mockPubClient;
  let mockSubClient;

  beforeAll((done) => {
    // Setup mock Redis clients
    mockRedisClient = {
      sAdd: jest.fn().mockResolvedValue(1),
      sRem: jest.fn().mockResolvedValue(1),
      sMembers: jest.fn().mockResolvedValue([]),
      del: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      get: jest.fn().mockResolvedValue(null),
      setEx: jest.fn().mockResolvedValue('OK'),
    };

    mockPubClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue(undefined),
    };

    mockSubClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined),
      unsubscribe: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
    };

    getRedisClient.mockReturnValue(mockRedisClient);

    // Mock redis client creation
    jest.mock('redis', () => ({
      createClient: jest.fn(() => mockPubClient),
    }));

    // Create HTTP server and Socket.io instance
    httpServer = createServer();
    io = new Server(httpServer);
    
    httpServer.listen(() => {
      httpServerAddr = httpServer.address();
      done();
    });
  });

  afterAll((done) => {
    io.close();
    httpServer.close(done);
  });

  beforeEach((done) => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup Socket.io connection handler
    io.on('connection', (socket) => {
      serverSocket = socket;
    });

    // Create client connection
    const token = jwt.sign({ id: 'user123' }, 'test-secret');
    clientSocket = new Client(`http://localhost:${httpServerAddr.port}`, {
      auth: { token },
      transports: ['websocket'],
    });

    clientSocket.on('connect', () => {
      done();
    });
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Connection Registration', () => {
    it('should register socket connection for user', async () => {
      const userId = 'user123';
      const socketId = 'socket-abc-123';

      await permissionRevocationService.registerConnection(userId, socketId);

      expect(mockRedisClient.sAdd).toHaveBeenCalledWith(
        'rbac:connections:user123',
        socketId
      );
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        'rbac:connections:user123',
        86400
      );
    });

    it('should unregister socket connection for user', async () => {
      const userId = 'user123';
      const socketId = 'socket-abc-123';

      await permissionRevocationService.unregisterConnection(userId, socketId);

      expect(mockRedisClient.sRem).toHaveBeenCalledWith(
        'rbac:connections:user123',
        socketId
      );
    });

    it('should get all active connections for user', async () => {
      const userId = 'user123';
      const socketIds = ['socket1', 'socket2', 'socket3'];
      
      mockRedisClient.sMembers.mockResolvedValue(socketIds);

      const result = await permissionRevocationService.getUserConnections(userId);

      expect(result).toEqual(socketIds);
      expect(mockRedisClient.sMembers).toHaveBeenCalledWith(
        'rbac:connections:user123'
      );
    });

    it('should handle Redis errors gracefully', async () => {
      const userId = 'user123';
      const socketId = 'socket-abc-123';
      
      mockRedisClient.sAdd.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(
        permissionRevocationService.registerConnection(userId, socketId)
      ).resolves.not.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to register socket connection',
        expect.objectContaining({
          error: 'Redis error',
          userId,
          socketId,
        })
      );
    });
  });

  describe('Permission Revocation', () => {
    it('should publish permission revocation event', async () => {
      // Initialize service with mock clients
      permissionRevocationService.pubClient = mockPubClient;
      permissionRevocationService.subClient = mockSubClient;
      permissionRevocationService.initialized = true;

      const userId = 'user123';
      const permission = 'join_quiz';
      const reason = 'Policy violation';

      await permissionRevocationService.revokePermission(
        userId,
        permission,
        reason
      );

      expect(mockPubClient.publish).toHaveBeenCalledWith(
        'rbac:permission:revoked',
        expect.stringContaining(userId)
      );

      const publishedMessage = JSON.parse(
        mockPubClient.publish.mock.calls[0][1]
      );
      expect(publishedMessage).toMatchObject({
        userIds: [userId],
        permission,
        reason,
      });
      expect(publishedMessage.timestamp).toBeDefined();
    });

    it('should handle multiple user IDs', async () => {
      permissionRevocationService.pubClient = mockPubClient;
      permissionRevocationService.initialized = true;

      const userIds = ['user1', 'user2', 'user3'];
      const permission = 'join_quiz';

      await permissionRevocationService.revokePermission(
        userIds,
        permission,
        'Bulk revocation'
      );

      const publishedMessage = JSON.parse(
        mockPubClient.publish.mock.calls[0][1]
      );
      expect(publishedMessage.userIds).toEqual(userIds);
    });

    it('should handle service not initialized', async () => {
      permissionRevocationService.pubClient = null;
      permissionRevocationService.initialized = false;

      await permissionRevocationService.revokePermission(
        'user123',
        'join_quiz',
        'Test'
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'PermissionRevocationService not initialized, skipping revocation broadcast'
      );
    });
  });

  describe('User Disconnection', () => {
    it('should disconnect user when permission revoked', async () => {
      // Setup
      permissionRevocationService.io = io;
      const userId = 'user123';
      const socketId = serverSocket.id;
      
      mockRedisClient.sMembers.mockResolvedValue([socketId]);

      // Track disconnection
      let disconnected = false;
      clientSocket.on('disconnect', () => {
        disconnected = true;
      });

      // Track permission_revoked event
      let revocationEvent = null;
      clientSocket.on('permission_revoked', (data) => {
        revocationEvent = data;
      });

      // Trigger disconnection
      await permissionRevocationService._disconnectUser(
        userId,
        'join_quiz',
        'Permission revoked'
      );

      // Wait for events to propagate
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(revocationEvent).toMatchObject({
        permission: 'join_quiz',
        reason: 'Permission revoked',
        message: expect.stringContaining('disconnected'),
      });
      expect(disconnected).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'rbac:connections:user123'
      );
    });

    it('should handle multiple active connections', async () => {
      permissionRevocationService.io = io;
      const userId = 'user123';
      
      // Simulate multiple socket IDs
      const socketIds = [serverSocket.id, 'socket2', 'socket3'];
      mockRedisClient.sMembers.mockResolvedValue(socketIds);

      await permissionRevocationService._disconnectUser(
        userId,
        'join_quiz',
        'Test'
      );

      // Should attempt to disconnect all sockets
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'rbac:connections:user123'
      );
      expect(logger.info).toHaveBeenCalledWith(
        'User disconnected from all sessions',
        expect.objectContaining({
          userId,
          disconnectedSockets: socketIds.length,
        })
      );
    });

    it('should handle no active connections', async () => {
      permissionRevocationService.io = io;
      const userId = 'user123';
      
      mockRedisClient.sMembers.mockResolvedValue([]);

      await permissionRevocationService._disconnectUser(
        userId,
        'join_quiz',
        'Test'
      );

      expect(logger.debug).toHaveBeenCalledWith(
        'No active connections for user',
        { userId }
      );
    });

    it('should clean up stale socket references', async () => {
      permissionRevocationService.io = io;
      const userId = 'user123';
      
      // Return a socket ID that doesn't exist
      mockRedisClient.sMembers.mockResolvedValue(['nonexistent-socket']);

      await permissionRevocationService._disconnectUser(
        userId,
        'join_quiz',
        'Test'
      );

      // Should still clean up the connection tracking
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'rbac:connections:user123'
      );
    });
  });

  describe('Role Revocation', () => {
    it('should revoke user role and disconnect', async () => {
      permissionRevocationService.pubClient = mockPubClient;
      permissionRevocationService.initialized = true;

      const userId = 'user123';
      const roleName = 'participant';
      const reason = 'Role reassignment';

      // Mock RBAC service
      const rbacService = require('../services/rbac/rbac.service');
      rbacService.invalidateUserCache = jest.fn().mockResolvedValue(undefined);

      await permissionRevocationService.revokeUserRole(
        userId,
        roleName,
        reason
      );

      expect(mockPubClient.publish).toHaveBeenCalled();
      const publishedMessage = JSON.parse(
        mockPubClient.publish.mock.calls[0][1]
      );
      expect(publishedMessage.permission).toBe('role:participant');
      expect(rbacService.invalidateUserCache).toHaveBeenCalledWith(userId);
    });
  });

  describe('Disconnection Timing - Requirement 10.6', () => {
    it('should complete disconnection within 30 seconds', async () => {
      permissionRevocationService.io = io;
      permissionRevocationService.pubClient = mockPubClient;
      permissionRevocationService.initialized = true;

      const userId = 'user123';
      const socketId = serverSocket.id;
      
      mockRedisClient.sMembers.mockResolvedValue([socketId]);

      // Track disconnection timing
      const startTime = Date.now();
      let disconnectTime = null;

      clientSocket.on('disconnect', () => {
        disconnectTime = Date.now();
      });

      // Trigger revocation
      await permissionRevocationService.revokePermission(
        userId,
        'join_quiz',
        'Timing test'
      );

      // Manually trigger the disconnection (simulating pub/sub)
      await permissionRevocationService._disconnectUser(
        userId,
        'join_quiz',
        'Timing test'
      );

      // Wait for disconnection
      await new Promise(resolve => setTimeout(resolve, 100));

      const elapsedTime = disconnectTime - startTime;
      
      // Requirement 10.6: Must complete within 30 seconds (30000ms)
      expect(elapsedTime).toBeLessThan(30000);
      
      // In practice, should be much faster (< 1 second)
      expect(elapsedTime).toBeLessThan(1000);
    });

    it('should handle disconnection under load', async () => {
      permissionRevocationService.io = io;
      const userId = 'user123';
      
      // Simulate 10 concurrent connections
      const socketIds = Array.from({ length: 10 }, (_, i) => `socket-${i}`);
      mockRedisClient.sMembers.mockResolvedValue(socketIds);

      const startTime = Date.now();

      await permissionRevocationService._disconnectUser(
        userId,
        'join_quiz',
        'Load test'
      );

      const elapsedTime = Date.now() - startTime;

      // Should still complete quickly even with multiple connections
      expect(elapsedTime).toBeLessThan(5000);
    });
  });

  describe('Service Lifecycle', () => {
    it('should initialize with Socket.io instance', async () => {
      const service = require('../services/rbac/permissionRevocation.service');
      
      // Reset initialization state
      service.initialized = false;
      service.pubClient = null;
      service.subClient = null;

      // Mock createClient to return our mocks
      const { createClient } = require('redis');
      createClient.mockReturnValueOnce(mockPubClient);
      createClient.mockReturnValueOnce(mockSubClient);

      await service.initialize(io);

      expect(mockPubClient.connect).toHaveBeenCalled();
      expect(mockSubClient.connect).toHaveBeenCalled();
      expect(mockSubClient.subscribe).toHaveBeenCalledWith(
        'rbac:permission:revoked',
        expect.any(Function)
      );
      expect(service.initialized).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      const service = require('../services/rbac/permissionRevocation.service');
      service.initialized = true;

      await service.initialize(io);

      expect(logger.warn).toHaveBeenCalledWith(
        'PermissionRevocationService already initialized'
      );
    });

    it('should cleanup on shutdown', async () => {
      const service = require('../services/rbac/permissionRevocation.service');
      service.pubClient = mockPubClient;
      service.subClient = mockSubClient;
      service.initialized = true;

      await service.cleanup();

      expect(mockSubClient.unsubscribe).toHaveBeenCalledWith(
        'rbac:permission:revoked'
      );
      expect(mockSubClient.quit).toHaveBeenCalled();
      expect(mockPubClient.quit).toHaveBeenCalled();
      expect(service.initialized).toBe(false);
    });
  });
});
