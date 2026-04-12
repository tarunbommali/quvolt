jest.mock('../models/Subscription', () => ({
  findOne: jest.fn(),
}));

jest.mock('../services/subscriptionService', () => ({
  getActiveSubscription: jest.fn(),
  getHostCurrentPlan: jest.fn(),
  createSubscription: jest.fn(),
  cancelSubscription: jest.fn(),
  getSubscriptionStats: jest.fn(),
}));

jest.mock('../utils/subscriptionPlans', () => ({
  getPlanConfig: jest.fn(),
  getAllPlans: jest.fn(),
  SUBSCRIPTION_PLANS: {
    FREE: { id: 'FREE', name: 'Free', monthlyAmount: 0 },
    PRO: { id: 'PRO', name: 'Pro', monthlyAmount: 49900 },
    PREMIUM: { id: 'PREMIUM', name: 'Premium', monthlyAmount: 99900 },
  },
}));

jest.mock('../config/razorpay', () => ({
  orders: { create: jest.fn() },
}));

jest.mock('../config/env', () => ({
  mockPaymentsEnabled: false,
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const { getActiveSubscription } = require('../services/subscriptionService');
const { getPlanConfig, getAllPlans } = require('../utils/subscriptionPlans');
const subscriptionController = require('../controllers/subscriptionController');

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('subscriptionController runtime error shapes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /plans returns stable 500 error shape when plan helper crashes', async () => {
    const req = {};
    const res = makeRes();

    getAllPlans.mockImplementation(() => {
      throw new Error('plan helper crash');
    });

    await subscriptionController.getAllSubscriptionPlans(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch plans',
      },
    });
  });

  test('GET /status returns stable 500 error shape when plan resolution fails', async () => {
    const req = { user: { _id: '507f1f77bcf86cd799439011' } };
    const res = makeRes();

    getActiveSubscription.mockResolvedValue(null);
    getPlanConfig.mockImplementation(() => {
      throw new Error('plan resolver unavailable');
    });

    await subscriptionController.getSubscriptionStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch subscription status',
      },
    });
  });

  test('POST /create returns stable 500 error shape when plan config crashes', async () => {
    const req = {
      body: { planId: 'PRO' },
      user: { _id: '507f1f77bcf86cd799439012' },
    };
    const res = makeRes();

    getPlanConfig.mockImplementation(() => {
      throw new Error('plan config exploded');
    });

    await subscriptionController.createSubscriptionOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to create subscription order',
      },
    });
  });
});
