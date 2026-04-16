jest.mock('../config/razorpay', () => ({
  orders: { create: jest.fn() },
  payments: { fetch: jest.fn() },
}));

jest.mock('../models/Payment', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

jest.mock('../models/HostAccount', () => ({
  findOne: jest.fn(),
}));

jest.mock('../models/QuizSnapshot', () => ({
  findById: jest.fn(),
}));

jest.mock('../models/FailedJob', () => ({
  findOneAndUpdate: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../services/subscriptionService', () => ({
  getHostCurrentPlan: jest.fn(),
}));

const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const Payment = require('../models/Payment');
const HostAccount = require('../models/HostAccount');
const QuizSnapshot = require('../models/QuizSnapshot');
const { getHostCurrentPlan } = require('../services/subscriptionService');
const {
  createOrder,
  handleWebhook,
  computeSplit,
  buildMarketplaceReceipt,
} = require('../controllers/paymentController');

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const mockLeanQuery = (value) => ({
  lean: async () => value,
});

describe('paymentController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set required environment variables
    process.env.DATABASE_URL = 'mongodb://test:test@localhost:27017/payment-test';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.WEBHOOK_SECRET = 'webhook-secret';
    process.env.RAZORPAY_KEY_ID = 'rzp_test';
    process.env.RAZORPAY_KEY_SECRET = 'secret';
    process.env.ROUTE_SPLIT_ENABLED = 'true';
    process.env.NODE_ENV = 'development';
    process.env.PAYMENTS_ENABLED = 'true';
  });

  test.each([
    ['FREE', 25, 100, { platformFeeAmount: 25, hostAmount: 75 }],
    ['PRO', 10, 499, { platformFeeAmount: 49.9, hostAmount: 449.1 }],
    ['PREMIUM', 5, 999, { platformFeeAmount: 49.95, hostAmount: 949.05 }],
  ])('applies %s commission dynamically at order creation', async (plan, expectedCommission, price, expectedSplit) => {
    const req = {
      body: { quizId: '507f1f77bcf86cd799439011' },
      user: { _id: '507f1f77bcf86cd799439012' },
      correlationId: 'corr-1',
    };
    const res = makeRes();

    QuizSnapshot.findById.mockReturnValue({
      select: () => ({
        lean: async () => ({
          _id: req.body.quizId,
          hostId: '507f1f77bcf86cd799439013',
          title: 'Paid Quiz',
          isPaid: true,
          price,
        }),
      }),
    });
    Payment.findOne.mockReturnValue(mockLeanQuery(null));
    HostAccount.findOne.mockReturnValue(mockLeanQuery({
      hostUserId: '507f1f77bcf86cd799439013',
      linkedAccountId: 'acc_123',
      accountStatus: 'active',
      settlementMode: 'scheduled',
    }));
    getHostCurrentPlan.mockResolvedValue(plan);
    razorpay.orders.create.mockResolvedValue({ id: `order_${plan.toLowerCase()}` });
    Payment.create.mockImplementation(async (payload) => payload);

    await createOrder(req, res);

    expect(razorpay.orders.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: price * 100,
      })
    );
    expect(Payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        platformFeeAmount: expectedSplit.platformFeeAmount,
        hostAmount: expectedSplit.hostAmount,
        metadata: expect.objectContaining({
          hostPlan: plan,
          platformFeePercent: expectedCommission,
        }),
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          hostPlan: plan,
          split: expect.objectContaining({
            platformFeePercent: expectedCommission,
          }),
        }),
      })
    );
  });

  test('blocks payout when host KYC is incomplete but still records host share', async () => {
    const req = {
      body: { quizId: '507f1f77bcf86cd799439021' },
      user: { _id: '507f1f77bcf86cd799439022' },
      correlationId: 'corr-2',
    };
    const res = makeRes();

    QuizSnapshot.findById.mockReturnValue({
      select: () => ({
        lean: async () => ({
          _id: req.body.quizId,
          hostId: '507f1f77bcf86cd799439023',
          title: 'KYC Quiz',
          isPaid: true,
          price: 100,
        }),
      }),
    });
    Payment.findOne.mockReturnValue(mockLeanQuery(null));
    HostAccount.findOne.mockReturnValue(mockLeanQuery({
      hostUserId: '507f1f77bcf86cd799439023',
      linkedAccountId: 'acc_pending',
      accountStatus: 'pending_kyc',
      settlementMode: 'scheduled',
    }));
    getHostCurrentPlan.mockResolvedValue('FREE');
    razorpay.orders.create.mockResolvedValue({ id: 'order_kyc' });
    Payment.create.mockImplementation(async (payload) => payload);

    await createOrder(req, res);

    expect(Payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        payoutMode: 'manual',
        payoutStatus: 'blocked_kyc',
        hostAmount: 75,
        metadata: expect.objectContaining({
          payoutBlockedReason: 'HOST_KYC_INCOMPLETE',
        }),
      })
    );
  });

  test('verifies webhook signatures against the raw request body', async () => {
    const body = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_123',
            order_id: 'order_123',
            fee: 100,
            tax: 18,
          },
        },
      },
    };
    const rawBody = Buffer.from('{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_123","order_id":"order_123","fee":100,"tax":18}}}}');
    const signature = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET).update(rawBody).digest('hex');
    const req = {
      headers: { 'x-razorpay-signature': signature },
      body,
      rawBody,
    };
    const res = makeRes();

    Payment.findOneAndUpdate.mockResolvedValue(null);

    await handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(Payment.findOneAndUpdate).toHaveBeenCalledWith(
      { razorpayOrderId: 'order_123', status: { $ne: 'completed' } },
      expect.objectContaining({
        $set: expect.objectContaining({
          razorpayPaymentId: 'pay_123',
          status: 'completed',
        }),
      }),
      { new: true }
    );
  });

  test('rounds split math in paise to avoid floating point leakage', () => {
    expect(computeSplit(99.99, 25)).toEqual(
      expect.objectContaining({
        grossPaise: 9999,
        platformFeePaise: 2500,
        hostPaise: 7499,
        platformFeeAmount: 25,
        hostAmount: 74.99,
      })
    );
  });

  test('builds compact marketplace receipts that stay within Razorpay limits', () => {
    const receipt = buildMarketplaceReceipt('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012');

    expect(receipt).toMatch(/^quiz_/);
    expect(receipt.length).toBeLessThanOrEqual(40);
  });
});
