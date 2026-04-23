jest.mock('../models/Subscription', () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  updateMany: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const Subscription = require('../models/Subscription');
const {
  getHostCurrentPlan,
  createSubscription,
  cancelSubscription,
  buildSubscriptionReceipt,
} = require('../services/subscription/subscription.service');

describe('subscriptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('falls back to FREE when there is no active subscription', async () => {
    Subscription.findOne.mockReturnValue({
      sort: async () => null,
    });

    await expect(getHostCurrentPlan('host_1')).resolves.toBe('FREE');
  });

  test('replaces prior active subscriptions when upgrading plans', async () => {
    const currentSubscription = {
      _id: 'sub_old',
      hostId: 'host_2',
      plan: 'FREE',
      status: 'active',
      expiryDate: new Date(Date.now() + 86400000),
    };
    const createdSubscription = { _id: 'sub_new', hostId: 'host_2', plan: 'PRO', status: 'active' };

    Subscription.find.mockReturnValue({
      sort: async () => [currentSubscription],
    });
    Subscription.updateMany.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
    Subscription.create.mockResolvedValue(createdSubscription);
    Subscription.findByIdAndUpdate.mockResolvedValue({});

    const result = await createSubscription('host_2', 'PRO', 'pay_123');

    expect(Subscription.updateMany).toHaveBeenCalledWith(
      {
        hostId: 'host_2',
        status: 'active',
      },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'replaced',
        }),
      })
    );
    expect(Subscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        hostId: 'host_2',
        plan: 'PRO',
        razorpaySubscriptionId: 'pay_123',
        status: 'active',
      })
    );
    expect(result).toEqual({ success: true, subscription: createdSubscription });
  });

  test('cancels paid subscriptions and creates a FREE fallback record', async () => {
    const subscription = {
      _id: 'sub_cancel',
      hostId: 'host_3',
      plan: 'PREMIUM',
      status: 'active',
      save: jest.fn().mockResolvedValue(true),
    };

    Subscription.findById.mockResolvedValue(subscription);
    Subscription.find.mockReturnValue({
      sort: async () => [],
    });
    Subscription.updateMany.mockResolvedValue({ acknowledged: true, modifiedCount: 0 });
    Subscription.create.mockResolvedValue({ _id: 'sub_free', hostId: 'host_3', plan: 'FREE', status: 'active' });

    await cancelSubscription('sub_cancel', 'user request');

    expect(subscription.status).toBe('cancelled');
    expect(subscription.cancellationReason).toBe('user request');
    expect(Subscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        hostId: 'host_3',
        plan: 'FREE',
        status: 'active',
      })
    );
  });

  test('builds compact subscription receipts that stay within Razorpay limits', () => {
    const receipt = buildSubscriptionReceipt('507f1f77bcf86cd799439011', 'PREMIUM');

    expect(receipt).toMatch(/^sub_/);
    expect(receipt.length).toBeLessThanOrEqual(40);
  });
});
