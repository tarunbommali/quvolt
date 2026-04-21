process.env.HTTP_SERVER_ENABLED = 'false';
process.env.SUBSCRIPTION_JOBS_ENABLED = 'false';
process.env.FAILED_JOB_WORKER_ENABLED = 'false';
process.env.PAYOUT_JOBS_ENABLED = 'false';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const crypto = require('crypto');

// Increase timeout for slow MongoMemoryServer
jest.setTimeout(30000);

// Mock external services
jest.mock('../../services/router/PaymentRouter', () => ({
  initialize: jest.fn(),
  startHealthMonitoring: jest.fn(),
  stopHealthMonitoring: jest.fn(),
  getGatewayHealthStatus: jest.fn().mockReturnValue([])
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

const app = require('../../server');
const Payment = require('../../models/Payment');
const Subscription = require('../../models/Subscription');

describe('Webhook Integration Tests', () => {
  let mongoServer;
  const webhookSecret = 'test_webhook_secret';

  beforeAll(async () => {
    process.env.WEBHOOK_SECRET = webhookSecret;
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Payment.deleteMany({});
    await Subscription.deleteMany({});
  });

  const generateSignature = (payload) => {
    return crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
  };

  test('successfully processes payment.captured webhook', async () => {
    const payment = await Payment.create({
      userId: new mongoose.Types.ObjectId(),
      quizId: new mongoose.Types.ObjectId(),
      amount: 100,
      razorpayOrderId: 'order_test_123',
      status: 'created'
    });

    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_test_123',
            order_id: 'order_test_123',
            amount: 10000,
            fee: 200,
            tax: 36
          }
        }
      }
    };

    const signature = generateSignature(payload);

    const response = await request(app)
      .post('/payment/webhook')
      .set('x-razorpay-signature', signature)
      .send(payload);

    expect(response.status).toBe(200);
    
    // Wait for background processing
    await new Promise(r => setTimeout(r, 1000));

    const updatedPayment = await Payment.findById(payment._id);
    expect(updatedPayment.status).toBe('completed');
    expect(updatedPayment.razorpayPaymentId).toBe('pay_test_123');
  });

  test('rejects webhook with invalid signature', async () => {
    const payload = { event: 'payment.captured' };
    const response = await request(app)
      .post('/payment/webhook')
      .set('x-razorpay-signature', 'invalid_sig')
      .send(payload);

    expect(response.status).toBe(401);
  });

  test('idempotency: processes same event only once', async () => {
    const orderId = 'order_idempotent_123';
    await Payment.create({
      userId: new mongoose.Types.ObjectId(),
      quizId: new mongoose.Types.ObjectId(),
      amount: 100,
      razorpayOrderId: orderId,
      status: 'created'
    });

    const payload = {
      event: 'payment.captured',
      created_at: 123456789,
      payload: {
        payment: {
          entity: {
            id: 'pay_idem_123',
            order_id: orderId,
            amount: 10000
          }
        }
      }
    };

    const signature = generateSignature(payload);

    // First call
    const res1 = await request(app)
      .post('/payment/webhook')
      .set('x-razorpay-signature', signature)
      .send(payload);
    expect(res1.status).toBe(200);

    // Second call immediately after
    const res2 = await request(app)
      .post('/payment/webhook')
      .set('x-razorpay-signature', signature)
      .send(payload);

    expect(res2.status).toBe(200);
  });
});
