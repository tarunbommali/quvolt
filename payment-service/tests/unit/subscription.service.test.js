const mongoose = require('mongoose');
const { createSubscription } = require('../../services/subscription/subscription.service');
const Subscription = require('../../models/Subscription');
const { getPlanConfig } = require('../../utils/subscriptionPlans');

jest.mock('../../models/Subscription');
jest.mock('../../utils/subscriptionPlans');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn()
}));

describe('Subscription Service Unit Tests', () => {
  const hostId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    getPlanConfig.mockImplementation((plan) => ({
      participants: plan === 'FREE' ? 10000 : 50000,
      commission: plan === 'FREE' ? 0.25 : 0.10,
      commissionPercent: plan === 'FREE' ? 25 : 10,
      monthlyAmount: plan === 'FREE' ? 0 : 49900,
      name: plan,
      razorpayPlanId: `plan_${plan.toLowerCase()}`
    }));
  });

  describe('createSubscription', () => {
    test('creates a FREE subscription and cancels active ones', async () => {
      Subscription.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([])
      });
      Subscription.updateMany.mockResolvedValue({ modifiedCount: 1 });
      Subscription.create.mockResolvedValue({ plan: 'FREE', status: 'active' });

      const result = await createSubscription(hostId, 'FREE');

      expect(Subscription.updateMany).toHaveBeenCalledWith(
        { hostId, status: 'active' },
        expect.any(Object)
      );
      expect(Subscription.create).toHaveBeenCalledWith(expect.objectContaining({
        hostId,
        plan: 'FREE',
        status: 'active'
      }));
      expect(result.success).toBe(true);
    });

    test('creates a paid subscription (CREATOR)', async () => {
      Subscription.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([])
      });
      Subscription.updateMany.mockResolvedValue({ modifiedCount: 0 });
      Subscription.create.mockResolvedValue({ plan: 'CREATOR', status: 'active' });

      const result = await createSubscription(hostId, 'CREATOR', 'razor_sub_123');

      expect(Subscription.create).toHaveBeenCalledWith(expect.objectContaining({
        hostId,
        plan: 'CREATOR',
        razorpaySubscriptionId: 'razor_sub_123',
        status: 'active'
      }));
      expect(result.success).toBe(true);
    });

    test('returns early if already on the same plan', async () => {
      Subscription.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([{ plan: 'CREATOR', status: 'active' }])
      });

      const result = await createSubscription(hostId, 'CREATOR');

      expect(Subscription.create).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });
});
