const kycService = require('../../services/kyc/kyc.service');
const HostAccount = require('../../models/HostAccount');
const razorpay = require('../../config/razorpay');
const config = require('../../config/env');
const mongoose = require('mongoose');

jest.mock('../../models/HostAccount');
jest.mock('../../config/razorpay');
jest.mock('../../config/env', () => ({
  mockPaymentsEnabled: false
}));

describe('KYC Service Unit Tests', () => {
  const hostUserId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createConnectedAccount', () => {
    test('throws error if account already exists', async () => {
      HostAccount.findOne.mockResolvedValue({ linkedAccountId: 'acc_123' });
      
      await expect(kycService.createConnectedAccount({ hostUserId }))
        .rejects.toThrow('Razorpay account already exists for this host');
    });

    test('creates a new Razorpay account and saves to DB', async () => {
      HostAccount.findOne.mockResolvedValue(null);
      razorpay.accounts.create.mockResolvedValue({ id: 'acc_new' });
      HostAccount.findOneAndUpdate.mockResolvedValue({ linkedAccountId: 'acc_new' });

      const result = await kycService.createConnectedAccount({
        hostUserId,
        email: 'test@host.com',
        name: 'Test Host'
      });

      expect(razorpay.accounts.create).toHaveBeenCalled();
      expect(HostAccount.findOneAndUpdate).toHaveBeenCalledWith(
        { hostUserId },
        expect.any(Object),
        expect.any(Object)
      );
      expect(result.linkedAccountId).toBe('acc_new');
    });
  });

  describe('checkKycStatus', () => {
    test('updates status to verified if Razorpay status is active', async () => {
      const hostAccount = { 
        linkedAccountId: 'acc_123', 
        save: jest.fn() 
      };
      HostAccount.findOne.mockResolvedValue(hostAccount);
      razorpay.accounts.fetch.mockResolvedValue({ status: 'active' });
      HostAccount.findOneAndUpdate.mockResolvedValue({ accountStatus: 'verified', payoutEnabled: true });

      const result = await kycService.checkKycStatus(hostUserId);

      expect(result.accountStatus).toBe('verified');
      expect(HostAccount.findOneAndUpdate).toHaveBeenCalledWith(
        { hostUserId },
        expect.objectContaining({
          $set: expect.objectContaining({ accountStatus: 'verified', payoutEnabled: true })
        }),
        expect.any(Object)
      );
    });
  });
});
