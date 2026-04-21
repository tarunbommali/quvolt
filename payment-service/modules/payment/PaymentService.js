const BaseService = require('../core/BaseService');
const Payment = require('../../models/Payment');
const HostAccount = require('../../models/HostAccount');
const QuizSnapshot = require('../../models/QuizSnapshot');
const { computeSplit } = require('../../services/payment/split.service');
const config = require('../../config/env');
const crypto = require('crypto');

/**
 * Payment Service (OOP Refactor)
 * Handles core payment business logic.
 * Requirements: SOLID SRP, Constructor DI.
 */
class PaymentService extends BaseService {
  /**
   * @param {Object} dependencies
   * @param {Object} dependencies.paymentRouter - Gateway router singleton
   * @param {Object} dependencies.subscriptionService - Subscription service
   * @param {Object} dependencies.idempotencyUtil - Idempotency helper
   */
  constructor({ paymentRouter, subscriptionService, idempotencyUtil }) {
    super('PaymentService');
    this.paymentRouter = paymentRouter;
    this.subscriptionService = subscriptionService;
    this.idempotencyUtil = idempotencyUtil;
  }

  /**
   * Create a payment order for a quiz
   */
  async createQuizOrder({ quizId, userId }) {
    return this.execute(async () => {
      const quiz = await this._getQuizForPayment(quizId);
      this._validateQuizForPayment(quiz);

      await this._checkExistingPayment(userId, quizId);

      const hostAccount = await HostAccount.findOne({ hostUserId: quiz.hostId }).lean();
      const hostPlan = await this.subscriptionService.getHostCurrentPlan(quiz.hostId);
      
      const { getCommissionForPlan } = require('../../utils/subscriptionPlans');
      const commissionPercent = getCommissionForPlan(hostPlan);
      const split = computeSplit(quiz.price, commissionPercent);

      const options = this._buildOrderOptions(quiz, userId, split, hostAccount);
      const { payoutMode, payoutStatus, payoutBlockedReason } = this._determinePayoutStatus(split, hostAccount);

      let routingResult;
      try {
        routingResult = await this.paymentRouter.routeCreateOrder(options);
      } catch (error) {
        routingResult = await this._handleRoutingFailure(error, options, quizId, userId);
      }

      const payment = await Payment.create({
        userId,
        quizId,
        amount: split.grossAmount,
        grossAmount: split.grossAmount,
        platformFeeAmount: split.platformFeeAmount,
        hostAmount: split.hostAmount,
        hostUserId: quiz.hostId,
        hostLinkedAccountId: hostAccount?.linkedAccountId || null,
        payoutMode,
        payoutStatus,
        currency: 'INR',
        razorpayOrderId: routingResult.id,
        status: 'created',
        metadata: {
          quizTitle: quiz.title,
          platformFeePercent: commissionPercent,
          hostPlan: hostPlan,
          payoutBlockedReason,
        },
        gatewayUsed: routingResult.gatewayUsed || null,
        attemptCount: routingResult.routingMetadata?.totalAttempts || 1,
        fallbackReason: routingResult.routingMetadata?.usedFallback 
          ? (routingResult.routingMetadata?.failedAttempts?.[0]?.error || 'Primary gateway unavailable')
          : null,
        routingMetadata: routingResult.routingMetadata || null,
      });

      return {
        orderId: routingResult.id,
        amount: split.grossAmount,
        currency: 'INR',
        key: process.env.RAZORPAY_KEY_ID || 'mock_key',
        mock: routingResult.gatewayUsed === 'mock',
        hostPlan,
        paymentId: payment._id,
        payoutMode,
      };
    });
  }

  /**
   * Verify a quiz payment
   */
  async verifyQuizPayment({ orderId, paymentId, signature }) {
    const idempotencyKey = `verify:payment:${orderId}`;

    return this.idempotencyUtil.ensureIdempotent(idempotencyKey, async () => {
      const payment = await Payment.findOne({ razorpayOrderId: orderId });
      if (!payment) {
        throw this._createError('Order not found', 'PAYMENT_NOT_FOUND', 404);
      }

      if (payment.status === 'completed') return payment;

      const isMock = config.mockPaymentsEnabled && orderId.startsWith('mock_quiz_');

      if (!isMock) {
        this._verifySignature(orderId, paymentId, signature);
      }

      // Fetch details from router (Polymorphism/DIP)
      const details = await this.paymentRouter.routeFetchPaymentDetails(paymentId).catch(() => null);
      
      const { toRupees } = require('../../services/payment/split.service');
      payment.razorpayPaymentId = paymentId;
      payment.razorpaySignature = signature;
      payment.status = 'completed';
      payment.gatewayFeeAmount = toRupees(details?.fee || 0);
      payment.taxAmount = toRupees(details?.tax || 0);
      await payment.save();

      return payment;
    });
  }

  // --- Private Helpers (Encapsulation) ---

  async _getQuizForPayment(quizId) {
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(quizId)) return null;
    return QuizSnapshot.findById(quizId).select('hostId title isPaid price').lean();
  }

  _validateQuizForPayment(quiz) {
    if (!quiz) throw this._createError('Quiz not found', 'QUIZ_NOT_FOUND', 404);
    if (!quiz.isPaid || Number(quiz.price || 0) <= 0) {
      throw this._createError('Quiz is not configured as a paid quiz', 'QUIZ_NOT_PAID', 400);
    }
  }

  async _checkExistingPayment(userId, quizId) {
    const existing = await Payment.findOne({ userId, quizId, status: 'completed' }).lean();
    if (existing) {
      throw this._createError('Payment already completed', 'PAYMENT_EXISTS', 409);
    }
  }

  _buildOrderOptions(quiz, userId, split, hostAccount) {
    const compactQuiz = String(quiz._id).slice(-6);
    const compactUser = String(userId).slice(-6);
    const compactTime = Date.now().toString().slice(-8);
    const receipt = `quiz_${compactQuiz}_${compactUser}_${compactTime}`;

    const options = {
      amount: split.grossPaise,
      currency: 'INR',
      receipt,
      notes: {
        quizId: String(quiz._id),
        userId: String(userId),
        hostUserId: String(quiz.hostId),
      },
    };

    if (split.hostPaise > 0 && hostAccount?.accountStatus === 'verified' && hostAccount.linkedAccountId && hostAccount.payoutEnabled) {
      if (String(process.env.ROUTE_SPLIT_ENABLED || 'true').toLowerCase() === 'true') {
        options.transfers = [{
          account: hostAccount.linkedAccountId,
          amount: split.hostPaise,
          currency: 'INR',
          notes: { orderId: receipt },
          on_hold: hostAccount.settlementMode !== 'instant',
        }];
      }
    }

    return options;
  }

  _determinePayoutStatus(split, hostAccount) {
    if (split.hostPaise <= 0) return { payoutMode: 'none', payoutStatus: 'not_applicable' };

    if (hostAccount?.accountStatus === 'verified' && hostAccount.linkedAccountId && hostAccount.payoutEnabled) {
      const splitEnabled = String(process.env.ROUTE_SPLIT_ENABLED || 'true').toLowerCase() === 'true';
      return {
        payoutMode: splitEnabled ? 'route' : 'manual',
        payoutStatus: splitEnabled ? 'processing' : 'pending'
      };
    }

    return {
      payoutMode: 'manual',
      payoutStatus: 'blocked_kyc',
      payoutBlockedReason: 'HOST_KYC_INCOMPLETE'
    };
  }

  async _handleRoutingFailure(error, options, quizId, userId) {
    if (config.mockPaymentsEnabled) {
      this.logWarn('Falling back to mock order', { quizId, userId });
      return {
        id: `mock_quiz_${String(quizId).slice(-6)}_${String(userId).slice(-6)}_${Date.now().toString().slice(-6)}`,
        gatewayUsed: 'mock',
        routingMetadata: { usedFallback: false, totalAttempts: 1 }
      };
    }
    throw error;
  }

  _verifySignature(orderId, paymentId, signature) {
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
      
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
      throw this._createError('Signature mismatch', 'INVALID_SIGNATURE', 400);
    }
  }

  _createError(message, code, status) {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    return error;
  }
}

module.exports = PaymentService;
