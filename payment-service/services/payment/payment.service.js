const mongoose = require('mongoose');
const Payment = require('../../models/Payment');
const HostAccount = require('../../models/HostAccount');
const QuizSnapshot = require('../../models/QuizSnapshot');
const { getHostCurrentPlan } = require('../subscription/subscription.service');
const { getCommissionForPlan } = require('../../utils/subscriptionPlans');
const paymentRouter = require('../router/PaymentRouter');
const { computeSplit } = require('./split.service');
const config = require('../../config/env');
const logger = require('../../utils/logger');

const ROUTE_SPLIT_ENABLED = String(process.env.ROUTE_SPLIT_ENABLED || 'true').toLowerCase() === 'true';

const buildMarketplaceReceipt = (quizId, userId) => {
  const compactQuiz = String(quizId).slice(-6);
  const compactUser = String(userId).slice(-6);
  const compactTime = Date.now().toString().slice(-8);
  return `quiz_${compactQuiz}_${compactUser}_${compactTime}`;
};

const buildMockMarketplaceOrderId = (quizId, userId) =>
  `mock_quiz_${String(quizId).slice(-6)}_${String(userId).slice(-6)}_${Date.now().toString().slice(-6)}`;

const isMockMarketplaceOrder = (orderId) => String(orderId || '').startsWith('mock_quiz_');

const getQuizForPayment = async (quizId) => {
  if (!mongoose.Types.ObjectId.isValid(quizId)) return null;
  return QuizSnapshot.findById(quizId).select('hostId title isPaid price').lean();
};

async function createQuizOrder({ quizId, userId }) {
  const quiz = await getQuizForPayment(quizId);
  if (!quiz) {
    const error = new Error('Quiz not found');
    error.code = 'QUIZ_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  if (!quiz.isPaid || Number(quiz.price || 0) <= 0) {
    const error = new Error('Quiz is not configured as a paid quiz');
    error.code = 'QUIZ_NOT_PAID';
    error.status = 400;
    throw error;
  }

  const existingPayment = await Payment.findOne({
    userId,
    quizId,
    status: 'completed',
  }).lean();

  if (existingPayment) {
    const error = new Error('Payment already completed for this quiz');
    error.code = 'PAYMENT_EXISTS';
    error.status = 409;
    error.details = { paymentId: existingPayment._id };
    throw error;
  }

  const hostAccount = await HostAccount.findOne({
    hostUserId: quiz.hostId,
  }).lean();

  const hostPlan = await getHostCurrentPlan(quiz.hostId);
  const commissionPercent = getCommissionForPlan(hostPlan);
  const split = computeSplit(quiz.price, commissionPercent);

  const notes = {
    quizId: String(quizId),
    userId: String(userId),
    hostUserId: String(quiz.hostId),
    hostPlan: hostPlan,
    platformFeePercent: String(commissionPercent),
  };

  const options = {
    amount: split.grossPaise,
    currency: 'INR',
    receipt: buildMarketplaceReceipt(quizId, userId),
    notes,
  };

  let payoutMode = 'none';
  let payoutStatus = 'not_applicable';
  let payoutBlockedReason = null;

  if (split.hostPaise > 0) {
    if (hostAccount?.accountStatus === 'verified' && hostAccount.linkedAccountId && hostAccount.payoutEnabled) {
      if (ROUTE_SPLIT_ENABLED) {
        options.transfers = [
          {
            account: hostAccount.linkedAccountId,
            amount: split.hostPaise,
            currency: 'INR',
            notes: {
              quizId: String(quizId),
              hostUserId: String(quiz.hostId),
              orderId: options.receipt,
            },
            on_hold: hostAccount.settlementMode !== 'instant',
          },
        ];
        payoutMode = 'route';
        payoutStatus = 'processing';
      } else {
        payoutMode = 'manual';
        payoutStatus = 'pending';
      }
    } else {
      payoutMode = 'manual';
      payoutStatus = 'blocked_kyc';
      payoutBlockedReason = 'HOST_KYC_INCOMPLETE';
    }
  }

  let razorpayOrder;
  let routingResult;
  try {
    routingResult = await paymentRouter.routeCreateOrder(options);
    razorpayOrder = { id: routingResult.id };
  } catch (error) {
    if (config.mockPaymentsEnabled) {
      logger.warn('Falling back to mock marketplace order', { quizId, userId, reason: error.message });
      razorpayOrder = { id: buildMockMarketplaceOrderId(quizId, userId) };
      routingResult = {
        id: razorpayOrder.id,
        gatewayUsed: 'mock',
        routingMetadata: {
          gateway: 'mock',
          priority: 0,
          latency: 0,
          attemptNumber: 1,
          totalAttempts: 1,
          usedFallback: false,
        },
      };
    } else {
      throw error;
    }
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
    razorpayOrderId: razorpayOrder.id,
    status: 'created',
    metadata: {
      quizTitle: quiz.title,
      platformFeePercent: commissionPercent,
      hostPlan: hostPlan,
      payoutBlockedReason,
    },
    gatewayUsed: routingResult?.gatewayUsed || null,
    attemptCount: routingResult?.routingMetadata?.totalAttempts || 1,
    fallbackReason: routingResult?.routingMetadata?.usedFallback 
      ? (routingResult?.routingMetadata?.failedAttempts?.[0]?.error || 'Primary gateway unavailable')
      : null,
    routingMetadata: routingResult?.routingMetadata || null,
  });

  return {
    orderId: razorpayOrder.id,
    amount: split.grossAmount,
    currency: 'INR',
    key: process.env.RAZORPAY_KEY_ID || 'mock_key',
    mock: config.mockPaymentsEnabled && isMockMarketplaceOrder(razorpayOrder.id),
    hostPlan,
    split: {
      platformFeeAmount: split.platformFeeAmount,
      hostAmount: split.hostAmount,
      platformFeePercent: commissionPercent,
    },
    paymentId: payment._id,
    payoutMode,
  };
}

async function verifyQuizPayment({ orderId, paymentId, signature }) {
  const { ensureIdempotent } = require('../../utils/idempotency');
  const idempotencyKey = `verify:payment:${orderId}`;

  return ensureIdempotent(idempotencyKey, async () => {
    const payment = await Payment.findOne({ razorpayOrderId: orderId });
    if (!payment) {
      const error = new Error('Order not found');
      error.code = 'PAYMENT_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (payment.status === 'completed') return payment;

    const isMock = config.mockPaymentsEnabled && isMockMarketplaceOrder(orderId);

    if (!isMock) {
      const crypto = require('crypto');
      const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
        const error = new Error('Signature mismatch');
        error.code = 'INVALID_SIGNATURE';
        error.status = 400;
        throw error;
      }
    }

    const razorpayPayment = await razorpay.payments.fetch(paymentId).catch(() => null);
    
    payment.razorpayPaymentId = paymentId;
    payment.razorpaySignature = signature;
    payment.status = 'completed';
    payment.gatewayFeeAmount = toRupees(razorpayPayment?.fee || 0);
    payment.taxAmount = toRupees(razorpayPayment?.tax || 0);
    await payment.save();

    return payment;
  });
}

module.exports = {
  createQuizOrder,
  verifyQuizPayment,
  buildMarketplaceReceipt,
  buildMockMarketplaceOrderId,
  isMockMarketplaceOrder,
};
