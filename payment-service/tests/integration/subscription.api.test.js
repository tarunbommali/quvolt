process.env.HTTP_SERVER_ENABLED = 'false';
process.env.SUBSCRIPTION_JOBS_ENABLED = 'false';
process.env.FAILED_JOB_WORKER_ENABLED = 'false';
process.env.PAYOUT_JOBS_ENABLED = 'false';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

// Increase timeout for slow MongoMemoryServer
jest.setTimeout(30000);

// Mock external dependencies
jest.mock('../../middleware/checkPermission', () => ({
  checkPermission: () => (req, res, next) => next(),
  checkRevenueOwnership: (req, res, next) => next(),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Mock Razorpay config to avoid real calls
jest.mock('../../config/razorpay', () => ({
  orders: { create: jest.fn() }
}));

// Mock PaymentRouter to avoid background health checks and provide controlled behavior
jest.mock('../../services/router/PaymentRouter', () => {
  return {
    initialize: jest.fn(),
    startHealthMonitoring: jest.fn(),
    stopHealthMonitoring: jest.fn(),
    routeCreateOrder: jest.fn(),
    routeVerifyPayment: jest.fn(),
    routeFetchPaymentDetails: jest.fn(),
    getGatewayHealthStatus: jest.fn().mockReturnValue([])
  };
});

const app = require('../../server');
const Subscription = require('../../models/Subscription');
const paymentRouter = require('../../services/router/PaymentRouter');
const razorpay = require('../../config/razorpay');

const generateAccessToken = (id, role) => jwt.sign({ id, role }, process.env.JWT_SECRET || 'test_secret');

describe('Subscription Integration Tests', () => {
  let mongoServer;
  let authToken;
  const hostId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri);

    authToken = generateAccessToken(hostId, 'host');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Subscription.deleteMany({});
    jest.clearAllMocks();
    
    // Default success mock for router
    paymentRouter.routeCreateOrder.mockResolvedValue({ id: 'razor_sub_order_123' });
  });

  describe('GET /subscription/plans', () => {
    test('returns all available subscription plans', async () => {
      const response = await request(app)
        .get('/subscription/plans');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.some(p => p.id === 'CREATOR')).toBe(true);
    });
  });

  describe('POST /subscription/create-order', () => {
    test('successfully creates a subscription order (paid)', async () => {
      const response = await request(app)
        .post('/subscription/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ planId: 'CREATOR' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.orderId).toBeDefined();
      expect(paymentRouter.routeCreateOrder).toHaveBeenCalled();
    });

    test('immediately downgrades to FREE if planId is FREE', async () => {
      const response = await request(app)
        .post('/subscription/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ planId: 'FREE' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toMatch(/upgraded to FREE/);
      
      const sub = await Subscription.findOne({ hostId, plan: 'FREE' });
      expect(sub).toBeDefined();
    });
  });
});
