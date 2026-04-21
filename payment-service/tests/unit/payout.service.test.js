const payoutService = require('../../services/payout/payout.service');
const Payment = require('../../models/Payment');
const HostAccount = require('../../models/HostAccount');
const mongoose = require('mongoose');

jest.mock('../../models/Payment');
jest.mock('../../models/HostAccount');

describe('Payout Service Unit Tests', () => {
  const hostUserId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('upsertHostAccountData', () => {
    test('successfully updates host account data', async () => {
      const accountData = {
        linkedAccountId: 'acc_123',
        accountStatus: 'verified',
        settlementMode: 'instant'
      };

      HostAccount.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ ...accountData, hostUserId })
      });

      const result = await payoutService.upsertHostAccountData(hostUserId, accountData);

      expect(HostAccount.findOneAndUpdate).toHaveBeenCalledWith(
        { hostUserId },
        { $set: expect.objectContaining({ linkedAccountId: 'acc_123' }) },
        expect.any(Object)
      );
      expect(result.linkedAccountId).toBe('acc_123');
    });

    test('throws error if linkedAccountId is missing', async () => {
      await expect(payoutService.upsertHostAccountData(hostUserId, {}))
        .rejects.toThrow('linkedAccountId is required');
    });
  });

  describe('getHostPayoutSummaryData', () => {
    test('aggregates payment data correctly', async () => {
      Payment.aggregate.mockResolvedValue([
        { _id: 'transferred', total: 500, count: 2 },
        { _id: 'pending', total: 100, count: 1 }
      ]);
      Payment.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });

      const result = await payoutService.getHostPayoutSummaryData(hostUserId);

      expect(result.totals.transferred).toBe(500);
      expect(result.totals.pending).toBe(100);
      expect(result.recent).toEqual([]);
    });
  });
});
