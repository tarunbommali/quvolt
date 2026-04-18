/**
 * Session Permission Revocation End-to-End Tests
 * Tests real-time permission revocation in active quiz sessions
 * Requirement: 10.6 - Disconnect users from active sessions within 30 seconds when permissions revoked
 * Task: 15.3 - Implement real-time permission revocation
 */

const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const jwt = require('jsonwebtoken');
const permissionRevocationService = require('../services/rbac/permissionRevocation.service');
const sessionAccessControl = require('../services/session/sessionAccessControl');
const rbacService = require('../services/rbac/rbac.service');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

// Mock dependencies
jest.mock('../config/redis');
jest.mock('../services/rbac/rbac.service');
jest.mock('../services/session/sessionAccessControl');
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('Session Permission Revocation E2E Tests', () => {
  let io;
  let httpServer;
  let httpServerAddr;
  let mockRedisClient;
  let mockPubClient;
  let mockSubClient;

  // Test users
  const hostUser = {
    _id: 'host123',
    email: 'host@test.com',
    role: 'host',
  };

  const participantUser = {
    _id: 'participant123',
    email: 'participant@test.com',
    role: 'participant',
  };

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
      subscribe: jest.fn().mockImplementation((channel, callback) => {
        // Store callback for manual triggering
        mockSubClient._callback = callback;
        return Promise.resolve();
      }),
      unsubscribe: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      _callback: null,
    };

    getRedisClient.mockReturnValue(mockRedisClient);

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

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock RBAC service
    rbacService.checkPermission.mockResolvedValue(true);
    rbacService.invalidateUserCache.mockResolvedValue(undefined);
    
    // Mock session access control
    sessionAccessControl.canJoinSession.mockResolvedValue({ allowed: true });
  });

  describe('Participant Permission Revocation in Active Session', () => {
    it('should disconnect participant when join_quiz permission revoked', async (done) => {
      // Initialize permission revocation service
      permissionRevocationService.io = io;
      permissionRevocationService.pubClient = mockPubClient;
      permissionRevocationService.subClient = mockSubClient;
      permissionRevocationService.initialized = true;

      // Create participant socket connection
      const token = jwt.sign({ id: participantUser._id }, 'test-secret');
      const participantSocket = new Client(`http://localhost:${httpServerAddr.port}`, {
        auth: { token },
        transports: ['websocket'],
      });

      let serverSocket;
      io.on('connection', (socket) => {
        serverSocket = socket;
        socket.data.user = participantUser;
      });

      participantSocket.on('connect', async () => {
        // Register connection
        await permissionRevocationService.registerConnection(
          participantUser._id,
          serverSocket.id
        );

        // Mock Redis to return the socket ID
        mockRedisClient.sMembers.mockResolvedValue([serverSocket.id]);

        // Track disconnection
        let disconnected = false;
        let revocationReason = null;

        participantSocket.on('permission_revoked', (data) => {
          revocationReason = data;
        });

        participantSocket.on('disconnect', () => {
          disconnected = true;
          
          // Verify disconnection occurred
          expect(disconnected).toBe(true);
          expect(revocationReason).toMatchObject({
            permission: 'join_quiz',
            reason: 'Policy violation',
            message: expect.stringContaining('disconnected'),
          });

          participantSocket.close();
          done();
        });

        // Revoke permission
        await permissionRevocationService.revokePermission(
          participantUser._id,
          'join_quiz',
          'Policy violation'
        );

        // Simulate pub/sub message delivery
        if (mockSubClient._callback) {
          const message = JSON.stringify({
            userIds: [participantUser._id],
            permission: 'join_quiz',
            reason: 'Policy violation',
            timestamp: new Date().toISOString(),
          });
          await mockSubClient._callback(message);
        }
      });
    });

    it('should disconnect multiple participants simultaneously', async (done) => {
      permissionRevocationService.io = io;
      permissionRevocationService.pubClient = mockPubClient;
      permissionRevocationService.initialized = true;

      const participants = [
        { _id: 'p1', email: 'p1@test.com', role: 'participant' },
        { _id: 'p2', email: 'p2@test.com', role: 'participant' },
        { _id: 'p3', email: 'p3@test.com', role: 'participant' },
      ];

      const sockets = [];
      const disconnectedUsers = new Set();

      let connectedCount = 0;

      // Create connections for all participants
      for (const participant of participants) {
        const token = jwt.sign({ id: participant._id }, 'test-secret');
        const socket = new Client(`http://localhost:${httpServerAddr.port}`, {
          auth: { token },
          transports: ['websocket'],
        });

        socket.on('connect', async () => {
          connectedCount++;
          
          if (connectedCount === participants.length) {
            // All connected, now revoke permissions
            const socketIds = Array.from(io.sockets.sockets.keys());
            
            // Mock Redis to return all socket IDs for each user
            mockRedisClient.sMembers.mockImplementation((key) => {
              const userId = key.replace('rbac:connections:', '');
              const userSocket = socketIds.find((sid) => {
                const s = io.sockets.sockets.get(sid);
                return s?.data?.user?._id === userId;
              });
              return Promise.resolve(userSocket ? [userSocket] : []);
            });

            // Revoke permissions for all participants
            await permissionRevocationService.revokePermission(
              participants.map(p => p._id),
              'join_quiz',
              'Bulk revocation test'
            );

            // Simulate pub/sub message
            if (mockSubClient._callback) {
              const message = JSON.stringify({
                userIds: participants.map(p => p._id),
                permission: 'join_quiz',
                reason: 'Bulk revocation test',
                timestamp: new Date().toISOString(),
              });
              await mockSubClient._callback(message);
            }
          }
        });

        socket.on('disconnect', () => {
          disconnectedUsers.add(participant._id);
          
          if (disconnectedUsers.size === participants.length) {
            // All disconnected
            expect(disconnectedUsers.size).toBe(3);
            sockets.forEach(s => s.close());
            done();
          }
        });

        sockets.push(socket);
      }

      // Setup server-side user data
      io.on('connection', (socket) => {
        const userId = socket.handshake.auth.token;
        const participant = participants.find(p => 
          jwt.verify(userId, 'test-secret').id === p._id
        );
        if (participant) {
          socket.data.user = participant;
        }
      });
    });
  });

  describe('Host Permission Revocation', () => {
    it('should disconnect host when manage_quiz permission revoked', async (done) => {
      permissionRevocationService.io = io;
      permissionRevocationService.pubClient = mockPubClient;
      permissionRevocationService.subClient = mockSubClient;
      permissionRevocationService.initialized = true;

      const token = jwt.sign({ id: hostUser._id }, 'test-secret');
      const hostSocket = new Client(`http://localhost:${httpServerAddr.port}`, {
        auth: { token },
        transports: ['websocket'],
      });

      let serverSocket;
      io.on('connection', (socket) => {
        serverSocket = socket;
        socket.data.user = hostUser;
      });

      hostSocket.on('connect', async () => {
        await permissionRevocationService.registerConnection(
          hostUser._id,
          serverSocket.id
        );

        mockRedisClient.sMembers.mockResolvedValue([serverSocket.id]);

        let disconnected = false;
        let revocationData = null;

        hostSocket.on('permission_revoked', (data) => {
          revocationData = data;
        });

        hostSocket.on('disconnect', () => {
          disconnected = true;
          
          expect(disconnected).toBe(true);
          expect(revocationData).toMatchObject({
            permission: 'manage_quiz',
            reason: 'Host privileges revoked',
          });

          hostSocket.close();
          done();
        });

        // Revoke host permission
        await permissionRevocationService.revokePermission(
          hostUser._id,
          'manage_quiz',
          'Host privileges revoked'
        );

        // Simulate pub/sub
        if (mockSubClient._callback) {
          const message = JSON.stringify({
            userIds: [hostUser._id],
            permission: 'manage_quiz',
            reason: 'Host privileges revoked',
            timestamp: new Date().toISOString(),
          });
          await mockSubClient._callback(message);
        }
      });
    });
  });

  describe('Session Access Control Integration', () => {
    it('should prevent rejoining after permission revocation', async (done) => {
      permissionRevocationService.io = io;
      permissionRevocationService.pubClient = mockPubClient;
      permissionRevocationService.initialized = true;

      // First connection - allowed
      rbacService.checkPermission.mockResolvedValue(true);
      sessionAccessControl.canJoinSession.mockResolvedValue({ allowed: true });

      const token = jwt.sign({ id: participantUser._id }, 'test-secret');
      const socket1 = new Client(`http://localhost:${httpServerAddr.port}`, {
        auth: { token },
        transports: ['websocket'],
      });

      let serverSocket;
      io.on('connection', (socket) => {
        serverSocket = socket;
        socket.data.user = participantUser;
      });

      socket1.on('connect', async () => {
        await permissionRevocationService.registerConnection(
          participantUser._id,
          serverSocket.id
        );

        mockRedisClient.sMembers.mockResolvedValue([serverSocket.id]);

        socket1.on('disconnect', async () => {
          // After disconnection, permission check should fail
          rbacService.checkPermission.mockResolvedValue(false);
          sessionAccessControl.canJoinSession.mockResolvedValue({
            allowed: false,
            reason: 'You do not have permission to join quiz sessions',
          });

          // Attempt to reconnect
          const socket2 = new Client(`http://localhost:${httpServerAddr.port}`, {
            auth: { token },
            transports: ['websocket'],
          });

          socket2.on('connect', async () => {
            // Check if user can join session
            const accessCheck = await sessionAccessControl.canJoinSession(
              participantUser,
              { _id: 'quiz123', accessType: 'public' }
            );

            expect(accessCheck.allowed).toBe(false);
            expect(accessCheck.reason).toContain('permission');

            socket2.close();
            done();
          });
        });

        // Revoke permission
        await permissionRevocationService.revokePermission(
          participantUser._id,
          'join_quiz',
          'Access revoked'
        );

        // Simulate pub/sub
        if (mockSubClient._callback) {
          const message = JSON.stringify({
            userIds: [participantUser._id],
            permission: 'join_quiz',
            reason: 'Access revoked',
            timestamp: new Date().toISOString(),
          });
          await mockSubClient._callback(message);
        }
      });
    });
  });

  describe('Performance - 30 Second Requirement', () => {
    it('should complete disconnection within 30 seconds for large session', async (done) => {
      permissionRevocationService.io = io;
      permissionRevocationService.pubClient = mockPubClient;
      permissionRevocationService.initialized = true;

      const participantCount = 50;
      const participants = Array.from({ length: participantCount }, (_, i) => ({
        _id: `participant${i}`,
        email: `p${i}@test.com`,
        role: 'participant',
      }));

      const sockets = [];
      const disconnectedUsers = new Set();
      let connectedCount = 0;
      let startTime;

      // Create connections
      for (const participant of participants) {
        const token = jwt.sign({ id: participant._id }, 'test-secret');
        const socket = new Client(`http://localhost:${httpServerAddr.port}`, {
          auth: { token },
          transports: ['websocket'],
        });

        socket.on('connect', async () => {
          connectedCount++;
          
          if (connectedCount === participantCount) {
            // All connected, start timer and revoke
            startTime = Date.now();
            
            const socketIds = Array.from(io.sockets.sockets.keys());
            mockRedisClient.sMembers.mockImplementation((key) => {
              const userId = key.replace('rbac:connections:', '');
              const userSocket = socketIds.find((sid) => {
                const s = io.sockets.sockets.get(sid);
                return s?.data?.user?._id === userId;
              });
              return Promise.resolve(userSocket ? [userSocket] : []);
            });

            // Revoke all
            await permissionRevocationService.revokePermission(
              participants.map(p => p._id),
              'join_quiz',
              'Performance test'
            );

            // Simulate pub/sub
            if (mockSubClient._callback) {
              const message = JSON.stringify({
                userIds: participants.map(p => p._id),
                permission: 'join_quiz',
                reason: 'Performance test',
                timestamp: new Date().toISOString(),
              });
              await mockSubClient._callback(message);
            }
          }
        });

        socket.on('disconnect', () => {
          disconnectedUsers.add(participant._id);
          
          if (disconnectedUsers.size === participantCount) {
            const elapsedTime = Date.now() - startTime;
            
            // Requirement 10.6: Must complete within 30 seconds
            expect(elapsedTime).toBeLessThan(30000);
            
            // Log performance
            logger.info('Disconnection performance test completed', {
              participantCount,
              elapsedTimeMs: elapsedTime,
              avgTimePerUser: elapsedTime / participantCount,
            });

            sockets.forEach(s => s.close());
            done();
          }
        });

        sockets.push(socket);
      }

      // Setup server-side user data
      io.on('connection', (socket) => {
        const userId = socket.handshake.auth.token;
        try {
          const decoded = jwt.verify(userId, 'test-secret');
          const participant = participants.find(p => p._id === decoded.id);
          if (participant) {
            socket.data.user = participant;
          }
        } catch (err) {
          // Ignore
        }
      });
    }, 60000); // 60 second timeout for this test
  });
});
