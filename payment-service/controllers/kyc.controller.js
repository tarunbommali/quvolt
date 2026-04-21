const { kycService } = require('../modules');
const logger = require('../utils/logger');

/**
 * KYC Controller (OOP Refactored)
 * Routes HTTP requests to the refactored KycService class.
 */
class KycController {
  /**
   * Helper for standardized error responses
   */
  _paymentError(res, status, code, message, correlationId, extras = {}) {
    return res.status(status).json({
      error: {
        code,
        message,
        details: {
          correlationId,
          ...extras,
        },
      },
    });
  }

  /**
   * Create a sub-account for a host
   */
  async createSubAccount(req, res) {
    try {
      const hostUserId = req.user._id;
      const { email, phone, name } = req.body;

      const hostAccount = await kycService.createConnectedAccount({
        hostUserId,
        email,
        phone,
        name,
      });

      return res.status(200).json({ success: true, data: hostAccount });
    } catch (error) {
      if (error.code === 'PAYMENTS_DISABLED') {
        return this._paymentError(res, 503, 'PAYMENTS_DISABLED', 'Payment operations disabled', req.correlationId);
      }
      if (error.code === 'ACCOUNT_EXISTS') {
        return this._paymentError(res, 400, 'ACCOUNT_EXISTS', error.message, req.correlationId);
      }
      logger.error('Create sub-account error', { error: error.message, stack: error.stack });
      return this._paymentError(res, 500, 'SERVER_ERROR', 'Failed to create sub-account', req.correlationId);
    }
  }

  /**
   * Generate onboarding link for the host
   */
  async getOnboardingLink(req, res) {
    try {
      const hostUserId = req.user._id;
      const link = await kycService.generateOnboardingLink(hostUserId);
      return res.status(200).json({ success: true, data: link });
    } catch (error) {
      if (error.code === 'PAYMENTS_DISABLED') {
        return this._paymentError(res, 503, 'PAYMENTS_DISABLED', 'Payment operations disabled', req.correlationId);
      }
      if (error.code === 'ACCOUNT_NOT_FOUND') {
        return this._paymentError(res, 404, 'ACCOUNT_NOT_FOUND', error.message, req.correlationId);
      }
      logger.error('Get onboarding link error', { error: error.message, stack: error.stack });
      return this._paymentError(res, 500, 'SERVER_ERROR', 'Failed to generate onboarding link', req.correlationId);
    }
  }

  /**
   * Check host's current KYC status
   */
  async checkKycStatus(req, res) {
    try {
      const hostUserId = req.user._id;
      const hostAccount = await kycService.checkKycStatus(hostUserId);
      return res.status(200).json({ success: true, data: hostAccount });
    } catch (error) {
      if (error.code === 'PAYMENTS_DISABLED') {
        return this._paymentError(res, 503, 'PAYMENTS_DISABLED', 'Payment operations disabled', req.correlationId);
      }
      if (error.code === 'ACCOUNT_NOT_FOUND') {
        return this._paymentError(res, 404, 'ACCOUNT_NOT_FOUND', error.message, req.correlationId);
      }
      logger.error('Check KYC status error', { error: error.message, stack: error.stack });
      return this._paymentError(res, 500, 'SERVER_ERROR', 'Failed to fetch KYC status', req.correlationId);
    }
  }
}

module.exports = new KycController();
