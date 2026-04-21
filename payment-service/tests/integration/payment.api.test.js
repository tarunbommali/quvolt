process.env.HTTP_SERVER_ENABLED = 'false';
process.env.SUBSCRIPTION_JOBS_ENABLED = 'false';
process.env.FAILED_JOB_WORKER_ENABLED = 'false';
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
jest.mock('../../middleware/checkPermission', () => ({
  checkPermission: () => (req, res, next) => next(),
  checkRevenueOwnership: (req, res, next) => next(),
}));
const app = require('../../server');
const Payment = require('../../models/Payment');
const QuizSnapshot = require('../../models/QuizSnapshot');
const jwt = require('jsonwebtoken');
const generateAccessToken = (id, role) => jwt.sign({ id, role }, process.env.JWT_SECRET || 'test_secret');

// Mock external services
jest.mock('../../services/router/PaymentRouter', () => ({
  routeCreateOrder: jest.fn().mockResolvedValue({
    id: 'rzp_test_order_123',
    gatewayUsed: 'razorpay_primary',
    routingMetadata: { totalAttempts: 1, usedFallback: false }
  }),
  initialize: jest.fn(),
  stopHealthMonitoring: jest.fn()
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('Payment Integration Tests', () => {
  let mongoServer;
  let authToken;
  const userId = new mongoose.Types.ObjectId();
  const hostId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    // Shutdown the actual server listeners if they started
    // In our server.js, we check httpServerEnabled but module.exports = app anyway
    process.env.HTTP_SERVER_ENABLED = 'false';
    process.env.SUBSCRIPTION_JOBS_ENABLED = 'false';
    process.env.FAILED_JOB_WORKER_ENABLED = 'false';
    
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    // Override mongoose connect for the app
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri);

    authToken = generateAccessToken(userId, 'admin');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Payment.deleteMany({});
    await QuizSnapshot.deleteMany({});
  });

  describe('POST /payment/create-order', () => {
    test('successfully creates a payment order for a quiz', async () => {
      const quiz = await QuizSnapshot.create({
        _id: new mongoose.Types.ObjectId(),
        hostId,
        title: 'Paid Test Quiz',
        isPaid: true,
        price: 100
      });

      const response = await request(app)
        .post('/payment/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quizId: quiz._id });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.orderId).toBe('rzp_test_order_123');
      
      const payment = await Payment.findOne({ quizId: quiz._id, userId });
      expect(payment).toBeDefined();
      expect(payment.status).toBe('created');
    });

    test('returns 404 for non-existent quiz', async () => {
      const response = await request(app)
        .post('/payment/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quizId: new mongoose.Types.ObjectId() });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('QUIZ_NOT_FOUND');
    });

    test('returns 400 for a free quiz', async () => {
      const quiz = await QuizSnapshot.create({
        hostId,
        title: 'Free Quiz',
        isPaid: false,
        price: 0
      });

      const response = await request(app)
        .post('/payment/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quizId: quiz._id });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('QUIZ_NOT_PAID');
    });
  });
});
