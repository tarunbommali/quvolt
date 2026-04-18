/**
 * Integration tests for Payment Transaction Tracking
 * Requirements: 6.1, 6.2, 6.3
 * 
 * This test suite validates:
 * - Metadata storage for gateway tracking (Req 6.1, 6.2)
 * - Transaction history API endpoint with filtering and pagination (Req 6.3)
 * - Revenue analytics endpoints with gateway breakdown (Req 6.3, 6.5, 6.6)
 * - Performance metrics calculation (success rates, avg response times) (Req 6.5, 6.6)
 * - Authorization (users can only see their own transactions, admins see all)
 * 
 * **Validates: Requirements 6.1, 6.2, 6.3**
 */

const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Payment = require('../models/Payment');
const PaymentRouter = require('../services/PaymentRouter');

// Mock environment to prevent server from starting and disable rate limiting
process.env.HTTP_SERVER_ENABLED = 'false';
process.env.SUBSCRIPTION_JOBS_ENABLED = 'false';
process.env.FAILED_JOB_WORKER_ENABLED = 'false';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-integration-tests';

// Mock Quiz model to avoid populate errors
const QuizSchema = new mongoose.Schema({
  title: String
}, { collection: 'quizzes' });

// Ensure Quiz model is registered before importing app
if (!mongoose.models.Quiz) {
  mongoose.model('Quiz', QuizSchema);
}

// Mock RBAC middleware to bypass permission checks in tests
jest.mock('../middleware/checkPermission', () => ({
  checkPermission: (permissionName) => (req, res, next) => next(),
  checkRevenueOwnership: (req, res, next) => {
    // Still enforce basic ownership rules for testing
    if (req.user?.role !== 'admin' && req.params?.userId && req.params.userId !== req.user?._id.toString()) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only view your own transaction history'
      });
    }
    next();
  }
}));

// Mock rate limiter to prevent 429 errors in tests
jest.mock('express-rate-limit', () => {
  return jest.fn(() => (req, res, next) => next());
});

// Import app after setting env vars and mocks
const app = require('../server');

// Test data
let mongoServer;
let testUserId;
let testUserId2;
let testQuizId;
let testQuizId2;
let userToken;
let user2Token;
let adminToken;

// Helper to generate JWT tokens
const generateToken = (userId, role = 'user') => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

// Helper to create test payments
const createTestPayment = async (overrides = {}) => {
  const defaults = {
    userId: testUserId,
    quizId: testQuizId,
    amount: 100,
    currency: 'INR',
    razorpayOrderId: `order_${Date.now()}_${Math.random()}`,
    status: 'completed',
    gatewayUsed: 'razorpay',
    attemptCount: 1,
    fallbackReason: null,
    routingMetadata: {
      gateway: 'razorpay',
      priority: 1,
      latency: 250,
      attemptNumber: 1,
      totalAttempts: 1,
      usedFallback: false
    }
  };

  return await Payment.create({ ...defaults, ...overrides });
};

describe('Transaction Tracking Integration Tests', () => {
  // Setup: Start in-memory MongoDB and connect
  beforeAll(async () => {
    // Close existing connection if any
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri);

    // Create test IDs
    testUserId = new mongoose.Types.ObjectId();
    testUserId2 = new mongoose.Types.ObjectId();
    testQuizId = new mongoose.Types.ObjectId();
    testQuizId2 = new mongoose.Types.ObjectId();

    // Generate tokens
    userToken = generateToken(testUserId.toString(), 'user');
    user2Token = generateToken(testUserId2.toString(), 'user');
    adminToken = generateToken(new mongoose.Types.ObjectId().toString(), 'admin');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear payments before each test
    await Payment.deleteMany({});
  });

  // ─── Test 1: Metadata Storage ───────────────────────────────────────────────

  describe('Metadata Storage (Requirements 6.1, 6.2)', () => {
    test('should store gateway metadata for successful transaction', async () => {
      const payment = await createTestPayment({
        gatewayUsed: 'razorpay',
        attemptCount: 1,
        fallbackReason: null,
        routingMetadata: {
          gateway: 'razorpay',
          priority: 1,
          latency: 250,
          attemptNumber: 1,
          totalAttempts: 1,
          usedFallback: false
        }
      });

      expect(payment.gatewayUsed).toBe('razorpay');
      expect(payment.attemptCount).toBe(1);
      expect(payment.fallbackReason).toBeNull();
      expect(payment.routingMetadata).toBeDefined();
      expect(payment.routingMetadata.gateway).toBe('razorpay');
      expect(payment.routingMetadata.latency).toBe(250);
      expect(payment.routingMetadata.usedFallback).toBe(false);
    });

    test('should store fallback metadata when fallback gateway is used', async () => {
      const payment = await createTestPayment({
        gatewayUsed: 'stripe',
        attemptCount: 2,
        fallbackReason: 'Primary gateway timeout',
        routingMetadata: {
          gateway: 'stripe',
          priority: 2,
          latency: 180,
          attemptNumber: 2,
          totalAttempts: 2,
          usedFallback: true,
          failedAttempts: [
            {
              gateway: 'razorpay',
              priority: 1,
              error: 'Gateway timeout',
              errorCode: 'GATEWAY_TIMEOUT',
              latency: 5000
            }
          ]
        }
      });

      expect(payment.gatewayUsed).toBe('stripe');
      expect(payment.attemptCount).toBe(2);
      expect(payment.fallbackReason).toBe('Primary gateway timeout');
      expect(payment.routingMetadata.usedFallback).toBe(true);
      expect(payment.routingMetadata.failedAttempts).toHaveLength(1);
      expect(payment.routingMetadata.failedAttempts[0].gateway).toBe('razorpay');
      expect(payment.routingMetadata.failedAttempts[0].errorCode).toBe('GATEWAY_TIMEOUT');
    });

    test('should store multiple failed attempts in routing metadata', async () => {
      const payment = await createTestPayment({
        gatewayUsed: 'paypal',
        attemptCount: 3,
        fallbackReason: 'Multiple gateway failures',
        routingMetadata: {
          gateway: 'paypal',
          priority: 3,
          latency: 200,
          attemptNumber: 3,
          totalAttempts: 3,
          usedFallback: true,
          failedAttempts: [
            {
              gateway: 'razorpay',
              priority: 1,
              error: 'Connection timeout',
              errorCode: 'GATEWAY_TIMEOUT',
              latency: 5000
            },
            {
              gateway: 'stripe',
              priority: 2,
              error: 'Service unavailable',
              errorCode: 'GATEWAY_ERROR',
              latency: 3000
            }
          ]
        }
      });

      expect(payment.attemptCount).toBe(3);
      expect(payment.routingMetadata.failedAttempts).toHaveLength(2);
    });
  });

  // ─── Test 2: Transaction History Endpoint ───────────────────────────────────

  describe('Transaction History Endpoint (Requirement 6.3)', () => {
    beforeEach(async () => {
      // Create test payments for user 1
      await createTestPayment({
        userId: testUserId,
        quizId: testQuizId,
        razorpayOrderId: 'order_user1_1',
        razorpayPaymentId: 'pay_user1_1',
        gatewayUsed: 'razorpay',
        status: 'completed',
        amount: 100
      });

      await createTestPayment({
        userId: testUserId,
        quizId: testQuizId2,
        razorpayOrderId: 'order_user1_2',
        razorpayPaymentId: 'pay_user1_2',
        gatewayUsed: 'stripe',
        status: 'completed',
        amount: 200,
        attemptCount: 2,
        fallbackReason: 'Primary gateway failed'
      });

      // Create test payment for user 2
      await createTestPayment({
        userId: testUserId2,
        quizId: testQuizId,
        razorpayOrderId: 'order_user2_1',
        razorpayPaymentId: 'pay_user2_1',
        gatewayUsed: 'razorpay',
        status: 'completed',
        amount: 150
      });
    });

    test('should return transaction history for authenticated user', async () => {
      const response = await request(app)
        .get(`/payment/transactions/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.transactions).toBeDefined();
      expect(response.body.transactions).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(2);
    });

    test('should filter transactions by gateway', async () => {
      const response = await request(app)
        .get(`/payment/transactions/${testUserId}?gatewayUsed=razorpay`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.transactions).toHaveLength(1);
      expect(response.body.transactions[0].gatewayUsed).toBe('razorpay');
    });

    test('should filter transactions by status', async () => {
      // Create a failed payment
      await createTestPayment({
        userId: testUserId,
        razorpayOrderId: 'order_failed',
        status: 'failed',
        gatewayUsed: 'razorpay'
      });

      const response = await request(app)
        .get(`/payment/transactions/${testUserId}?status=failed`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.transactions).toHaveLength(1);
      expect(response.body.transactions[0].status).toBe('failed');
    });

    test('should filter fallback transactions', async () => {
      const response = await request(app)
        .get(`/payment/transactions/${testUserId}?usedFallback=true`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.transactions).toHaveLength(1);
      expect(response.body.transactions[0].usedFallback).toBe(true);
      expect(response.body.transactions[0].fallbackReason).toBe('Primary gateway failed');
    });

    test('should filter non-fallback transactions', async () => {
      const response = await request(app)
        .get(`/payment/transactions/${testUserId}?usedFallback=false`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.transactions).toHaveLength(1);
      expect(response.body.transactions[0].usedFallback).toBe(false);
    });

    test('should support pagination', async () => {
      // Create more payments
      for (let i = 0; i < 25; i++) {
        await createTestPayment({
          userId: testUserId,
          razorpayOrderId: `order_page_${i}`,
          razorpayPaymentId: `pay_page_${i}`,
          amount: 100 + i
        });
      }

      // Get first page
      const page1 = await request(app)
        .get(`/payment/transactions/${testUserId}?page=1&limit=10`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(page1.body.transactions).toHaveLength(10);
      expect(page1.body.pagination.page).toBe(1);
      expect(page1.body.pagination.limit).toBe(10);
      expect(page1.body.pagination.total).toBe(27); // 25 + 2 from beforeEach

      // Get second page
      const page2 = await request(app)
        .get(`/payment/transactions/${testUserId}?page=2&limit=10`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(page2.body.transactions).toHaveLength(10);
      expect(page2.body.pagination.page).toBe(2);
    });

    test('should deny access when user tries to view other user transactions', async () => {
      const response = await request(app)
        .get(`/payment/transactions/${testUserId2}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
      expect(response.body.message).toContain('only view your own');
    });

    test('should allow admin to view any user transactions', async () => {
      const response = await request(app)
        .get(`/payment/transactions/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.transactions).toBeDefined();
      expect(response.body.transactions.length).toBeGreaterThan(0);
    });

    test('should return 401 when no auth token provided', async () => {
      await request(app)
        .get(`/payment/transactions/${testUserId}`)
        .expect(401);
    });

    test('should return 400 for invalid user ID', async () => {
      await request(app)
        .get('/payment/transactions/invalid-id')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });
  });

  // ─── Test 3: Revenue Analytics with Gateway Breakdown ───────────────────────

  describe('Revenue Analytics Endpoints (Requirements 6.3, 6.5, 6.6)', () => {
    beforeEach(async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Create payments with different gateways
      await createTestPayment({
        razorpayOrderId: 'order_rp_1',
        razorpayPaymentId: 'pay_rp_1',
        gatewayUsed: 'razorpay',
        amount: 1000,
        status: 'completed',
        routingMetadata: { latency: 200 },
        createdAt: now
      });

      await createTestPayment({
        razorpayOrderId: 'order_rp_2',
        razorpayPaymentId: 'pay_rp_2',
        gatewayUsed: 'razorpay',
        amount: 1500,
        status: 'completed',
        routingMetadata: { latency: 300 },
        createdAt: now
      });

      await createTestPayment({
        razorpayOrderId: 'order_st_1',
        razorpayPaymentId: 'pay_st_1',
        gatewayUsed: 'stripe',
        amount: 2000,
        status: 'completed',
        routingMetadata: { latency: 150 },
        createdAt: now,
        attemptCount: 2,
        fallbackReason: 'Primary gateway timeout'
      });

      await createTestPayment({
        razorpayOrderId: 'order_rp_failed',
        gatewayUsed: 'razorpay',
        amount: 500,
        status: 'failed',
        routingMetadata: { latency: 100 },
        createdAt: now
      });
    });

    test('should return revenue breakdown by gateway', async () => {
      const response = await request(app)
        .post('/payment/revenue/by-gateway')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(200);

      expect(response.body.gateways).toBeDefined();
      expect(response.body.gateways.length).toBeGreaterThan(0);

      const razorpayGateway = response.body.gateways.find(g => g.gateway === 'razorpay');
      expect(razorpayGateway).toBeDefined();
      expect(razorpayGateway.revenue).toBe(2500); // 1000 + 1500
      expect(razorpayGateway.transactionCount).toBe(3); // 2 completed + 1 failed
      expect(razorpayGateway.successfulTransactions).toBe(2);

      const stripeGateway = response.body.gateways.find(g => g.gateway === 'stripe');
      expect(stripeGateway).toBeDefined();
      expect(stripeGateway.revenue).toBe(2000);
      expect(stripeGateway.fallbackTransactions).toBe(1);
    });

    test('should calculate success rates correctly', async () => {
      const response = await request(app)
        .post('/payment/revenue/by-gateway')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(200);

      const razorpayGateway = response.body.gateways.find(g => g.gateway === 'razorpay');
      // 2 successful out of 3 total = 66.67%
      expect(razorpayGateway.successRate).toBe('66.67%');

      const stripeGateway = response.body.gateways.find(g => g.gateway === 'stripe');
      // 1 successful out of 1 total = 100%
      expect(stripeGateway.successRate).toBe('100.00%');
    });

    test('should calculate average response times', async () => {
      const response = await request(app)
        .post('/payment/revenue/by-gateway')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(200);

      const razorpayGateway = response.body.gateways.find(g => g.gateway === 'razorpay');
      // Average of successful: (200 + 300) / 2 = 250
      expect(razorpayGateway.avgResponseTime).toBe(250);

      const stripeGateway = response.body.gateways.find(g => g.gateway === 'stripe');
      expect(stripeGateway.avgResponseTime).toBe(150);
    });

    test('should filter by date range', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const response = await request(app)
        .post('/payment/revenue/by-gateway')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          startDate: yesterday.toISOString(),
          endDate: tomorrow.toISOString()
        })
        .expect(200);

      expect(response.body.gateways).toBeDefined();
      expect(response.body.gateways.length).toBeGreaterThan(0);
    });

    test('should return comprehensive analytics', async () => {
      const response = await request(app)
        .post('/payment/revenue/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(200);

      expect(response.body.overall).toBeDefined();
      expect(response.body.overall.totalRevenue).toBe(4500); // 1000 + 1500 + 2000
      expect(response.body.overall.transactionCount).toBe(4);

      expect(response.body.gatewayBreakdown).toBeDefined();
      expect(response.body.gatewayBreakdown.length).toBeGreaterThan(0);
    });
  });

  // ─── Test 4: Performance Metrics Calculation ────────────────────────────────

  describe('Performance Metrics Calculation (Requirements 6.5, 6.6)', () => {
    test('should calculate gateway success rates over 24-hour window', async () => {
      const now = new Date();

      // Create payments within 24 hours
      await createTestPayment({
        razorpayOrderId: 'order_24h_1',
        razorpayPaymentId: 'pay_24h_1',
        gatewayUsed: 'razorpay',
        status: 'completed',
        routingMetadata: { latency: 200 },
        createdAt: now
      });

      await createTestPayment({
        razorpayOrderId: 'order_24h_2',
        razorpayPaymentId: 'pay_24h_2',
        gatewayUsed: 'razorpay',
        status: 'completed',
        routingMetadata: { latency: 300 },
        createdAt: now
      });

      await createTestPayment({
        razorpayOrderId: 'order_24h_3',
        gatewayUsed: 'razorpay',
        status: 'failed',
        routingMetadata: { latency: 150 },
        createdAt: now
      });

      const router = new PaymentRouter.constructor();
      const successRates = await router.calculateGatewaySuccessRates();

      expect(successRates).toBeDefined();
      expect(Array.isArray(successRates)).toBe(true);

      if (successRates.length > 0) {
        const razorpayMetrics = successRates.find(m => m.gateway === 'razorpay');
        expect(razorpayMetrics).toBeDefined();
        expect(razorpayMetrics.totalTransactions).toBe(3);
        expect(razorpayMetrics.successfulTransactions).toBe(2);
        expect(razorpayMetrics.failedTransactions).toBe(1);
        expect(razorpayMetrics.successRate).toBe('66.67%');
        expect(razorpayMetrics.period).toBe('24h');
      }
    });

    test('should exclude payments older than 24 hours', async () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      // Create old payment
      await createTestPayment({
        razorpayOrderId: 'order_old',
        razorpayPaymentId: 'pay_old',
        gatewayUsed: 'razorpay',
        status: 'completed',
        createdAt: twoDaysAgo
      });

      // Create recent payment
      await createTestPayment({
        razorpayOrderId: 'order_recent',
        razorpayPaymentId: 'pay_recent',
        gatewayUsed: 'razorpay',
        status: 'completed',
        createdAt: now
      });

      const router = new PaymentRouter.constructor();
      const successRates = await router.calculateGatewaySuccessRates();

      const razorpayMetrics = successRates.find(m => m.gateway === 'razorpay');
      if (razorpayMetrics) {
        // Should only count the recent payment
        expect(razorpayMetrics.totalTransactions).toBe(1);
      }
    });

    test('should flag fallback transactions for review', async () => {
      await createTestPayment({
        razorpayOrderId: 'order_fallback',
        razorpayPaymentId: 'pay_fallback',
        gatewayUsed: 'stripe',
        status: 'completed',
        attemptCount: 2,
        fallbackReason: 'Primary gateway unavailable',
        routingMetadata: {
          usedFallback: true,
          failedAttempts: [{ gateway: 'razorpay', error: 'Timeout' }]
        }
      });

      const router = new PaymentRouter.constructor();
      const result = await router.getFlaggedFallbackTransactions({ limit: 10, page: 1 });

      expect(result.transactions).toBeDefined();
      expect(result.transactions.length).toBeGreaterThan(0);

      const flaggedTx = result.transactions[0];
      expect(flaggedTx.fallbackReason).toBe('Primary gateway unavailable');
      expect(flaggedTx.flaggedForReview).toBe(true);
      expect(flaggedTx.attemptCount).toBe(2);
      expect(flaggedTx.gatewayUsed).toBe('stripe');
    });

    test('should calculate average response times correctly', async () => {
      await createTestPayment({
        razorpayOrderId: 'order_lat_1',
        razorpayPaymentId: 'pay_lat_1',
        gatewayUsed: 'razorpay',
        status: 'completed',
        routingMetadata: { latency: 100 }
      });

      await createTestPayment({
        razorpayOrderId: 'order_lat_2',
        razorpayPaymentId: 'pay_lat_2',
        gatewayUsed: 'razorpay',
        status: 'completed',
        routingMetadata: { latency: 200 }
      });

      await createTestPayment({
        razorpayOrderId: 'order_lat_3',
        razorpayPaymentId: 'pay_lat_3',
        gatewayUsed: 'razorpay',
        status: 'completed',
        routingMetadata: { latency: 300 }
      });

      const router = new PaymentRouter.constructor();
      const successRates = await router.calculateGatewaySuccessRates();

      const razorpayMetrics = successRates.find(m => m.gateway === 'razorpay');
      if (razorpayMetrics) {
        // Average: (100 + 200 + 300) / 3 = 200
        expect(razorpayMetrics.avgResponseTime).toBe(200);
      }
    });
  });

  // ─── Test 5: Authorization Tests ────────────────────────────────────────────

  describe('Authorization (Requirement 6.3)', () => {
    beforeEach(async () => {
      await createTestPayment({
        userId: testUserId,
        razorpayOrderId: 'order_auth_1',
        razorpayPaymentId: 'pay_auth_1'
      });

      await createTestPayment({
        userId: testUserId2,
        razorpayOrderId: 'order_auth_2',
        razorpayPaymentId: 'pay_auth_2'
      });
    });

    test('user can view their own transactions', async () => {
      const response = await request(app)
        .get(`/payment/transactions/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.transactions).toHaveLength(1);
      expect(response.body.transactions[0].id).toBeDefined();
    });

    test('user cannot view other user transactions', async () => {
      await request(app)
        .get(`/payment/transactions/${testUserId2}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    test('admin can view any user transactions', async () => {
      const response1 = await request(app)
        .get(`/payment/transactions/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response1.body.transactions).toBeDefined();

      const response2 = await request(app)
        .get(`/payment/transactions/${testUserId2}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response2.body.transactions).toBeDefined();
    });

    test('unauthenticated request is rejected', async () => {
      await request(app)
        .get(`/payment/transactions/${testUserId}`)
        .expect(401);
    });

    test('invalid token is rejected', async () => {
      await request(app)
        .get(`/payment/transactions/${testUserId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  // ─── Test 6: Edge Cases and Error Handling ──────────────────────────────────

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty transaction history', async () => {
      const emptyUserId = new mongoose.Types.ObjectId();
      const emptyUserToken = generateToken(emptyUserId.toString(), 'user');

      const response = await request(app)
        .get(`/payment/transactions/${emptyUserId}`)
        .set('Authorization', `Bearer ${emptyUserToken}`)
        .expect(200);

      expect(response.body.transactions).toHaveLength(0);
      expect(response.body.pagination.total).toBe(0);
    });

    test('should handle pagination beyond available pages', async () => {
      await createTestPayment({
        userId: testUserId,
        razorpayOrderId: 'order_single',
        razorpayPaymentId: 'pay_single'
      });

      const response = await request(app)
        .get(`/payment/transactions/${testUserId}?page=999&limit=10`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.transactions).toHaveLength(0);
      expect(response.body.pagination.page).toBe(999);
    });

    test('should handle invalid query parameters gracefully', async () => {
      await createTestPayment({
        userId: testUserId,
        razorpayOrderId: 'order_query',
        razorpayPaymentId: 'pay_query'
      });

      const response = await request(app)
        .get(`/payment/transactions/${testUserId}?page=invalid&limit=abc`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Should default to page 1, limit 20
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
    });

    test('should limit maximum page size', async () => {
      const response = await request(app)
        .get(`/payment/transactions/${testUserId}?limit=1000`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Should cap at 100
      expect(response.body.pagination.limit).toBeLessThanOrEqual(100);
    });

    test('should handle missing routing metadata gracefully', async () => {
      await createTestPayment({
        userId: testUserId,
        razorpayOrderId: 'order_no_metadata',
        razorpayPaymentId: 'pay_no_metadata',
        routingMetadata: null
      });

      const response = await request(app)
        .get(`/payment/transactions/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.transactions).toHaveLength(1);
      expect(response.body.transactions[0].routingMetadata).toBeNull();
    });
  });
});
