const BaseService = require('../core/BaseService');
const HostAccount = require('../../models/HostAccount');
const config = require('../../config/env');
const razorpay = require('../../config/razorpay');

/**
 * KYC Service (OOP Refactor)
 * Handles host onboarding and verification.
 */
class KycService extends BaseService {
  constructor() {
    super('KycService');
  }

  /**
   * Create a connected account on the gateway
   */
  async createConnectedAccount({ hostUserId, email, phone, name }) {
    return this.execute(async () => {
      let hostAccount = await HostAccount.findOne({ hostUserId });

      if (hostAccount?.linkedAccountId) {
        throw this._createError('Razorpay account already exists', 'ACCOUNT_EXISTS', 400);
      }

      if (config.mockPaymentsEnabled) {
        return HostAccount.findOneAndUpdate(
          { hostUserId },
          { $set: { linkedAccountId: `mock_acc_${Date.now()}`, accountStatus: 'pending' } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }

      const account = await razorpay.accounts.create({
        email,
        phone: phone || undefined,
        type: 'route',
        reference_id: String(hostUserId),
        legal_business_name: name || 'Quvolt Host',
        customer_facing_business_name: (name || 'Quvolt Host').slice(0, 40),
        contact_name: name || 'Quvolt Host',
        business_type: 'individual',
        profile: {
          category: 'educational_services',
          subcategory: 'other_educational_services',
        }
      });

      return HostAccount.findOneAndUpdate(
        { hostUserId },
        { $set: { linkedAccountId: account.id, accountStatus: 'pending' } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    });
  }

  /**
   * Generate onboarding link for host
   */
  async generateOnboardingLink(hostUserId) {
    return this.execute(async () => {
      const hostAccount = await HostAccount.findOne({ hostUserId });
      if (!hostAccount?.linkedAccountId) {
        throw this._createError('Account not found', 'ACCOUNT_NOT_FOUND', 404);
      }

      if (config.mockPaymentsEnabled) {
        return { url: 'http://localhost:5173/studio/billing?kyc=success' };
      }

      const link = await razorpay.accountLink.create({
        account: hostAccount.linkedAccountId,
        refresh_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/studio/billing?kyc=refresh`,
        return_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/studio/billing?kyc=success`,
        type: 'account_onboarding',
      });

      return { url: link.short_url || link.url };
    });
  }

  /**
   * Check and update KYC status
   */
  async checkKycStatus(hostUserId) {
    return this.execute(async () => {
      let hostAccount = await HostAccount.findOne({ hostUserId });
      if (!hostAccount?.linkedAccountId) {
        throw this._createError('Account not found', 'ACCOUNT_NOT_FOUND', 404);
      }

      if (config.mockPaymentsEnabled) {
        hostAccount.accountStatus = 'verified';
        hostAccount.payoutEnabled = true;
        await hostAccount.save();
        return hostAccount;
      }

      const account = await razorpay.accounts.fetch(hostAccount.linkedAccountId);
      const status = account.kyc_verification_status || account.status || 'pending';
      
      let newStatus = 'pending';
      let payoutEnabled = false;
      
      if (['verified', 'activated', 'active'].includes(status)) {
        newStatus = 'verified';
        payoutEnabled = true;
      } else if (['rejected', 'suspended'].includes(status)) {
        newStatus = 'rejected';
      }

      return HostAccount.findOneAndUpdate(
        { hostUserId },
        { $set: { accountStatus: newStatus, payoutEnabled } },
        { new: true }
      );
    });
  }

  _createError(message, code, status, originalError = null) {
    const errorMsg = originalError?.description || originalError?.message || message;
    const error = new Error(errorMsg);
    error.code = code;
    error.status = status;
    return error;
  }
}

module.exports = KycService;
