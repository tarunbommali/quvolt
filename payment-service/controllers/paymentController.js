const razorpay = require('../config/razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const HostAccount = require('../models/HostAccount');
const QuizSnapshot = require('../models/QuizSnapshot');
const FailedJob = require('../models/FailedJob');
const logger = require('../utils/logger');
const { getHostCurrentPlan } = require('../services/subscriptionService');
const { getCommissionForPlan } = require('../utils/subscriptionPlans');
const config = require('../config/env');
const paymentRouter = require('../services/PaymentRouter');

// Keep legacy PLATFORM_FEE_PERCENT for backward compatibility
const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT || 20);
const ROUTE_SPLIT_ENABLED = String(process.env.ROUTE_SPLIT_ENABLED || 'true').toLowerCase() === 'true';

const toPaise = (rupees) => Math.round(Number(rupees || 0) * 100);
const toRupees = (paise) => Number((Number(paise || 0) / 100).toFixed(2));

const paymentError = (res, status, code, message, correlationId, extras = {}) =>
  res.status(status).json({
    error: {
      code,
      message,
      details: {
        correlationId,
        ...extras,
      },
    },
  });

const getQuizForPayment = async (quizId) => {
  if (!mongoose.Types.ObjectId.isValid(quizId)) return null;
  return QuizSnapshot.findById(quizId).select('hostId title isPaid price').lean();
};

// Updated computeSplit to accept commission percent
const computeSplit = (amountRupees, commissionPercent = PLATFORM_FEE_PERCENT) => {
  const grossPaise = toPaise(amountRupees);
  const platformFeePaise = Math.round((grossPaise * commissionPercent) / 100);
  const hostPaise = Math.max(0, grossPaise - platformFeePaise);

  return {
    grossPaise,
    platformFeePaise,
    hostPaise,
    grossAmount: toRupees(grossPaise),
    platformFeeAmount: toRupees(platformFeePaise),
    hostAmount: toRupees(hostPaise),
    commissionPercent,
  };
};

const buildWebhookSignaturePayload = (req) => {
  if (Buffer.isBuffer(req.rawBody)) {
    return req.rawBody;
  }
  return Buffer.from(JSON.stringify(req.body || {}), 'utf8');
};

const buildMarketplaceReceipt = (quizId, userId) => {
  const compactQuiz = String(quizId).slice(-6);
  const compactUser = String(userId).slice(-6);
  const compactTime = Date.now().toString().slice(-8);
  return `quiz_${compactQuiz}_${compactUser}_${compactTime}`;
};

const buildMockMarketplaceOrderId = (quizId, userId) =>
  `mock_quiz_${String(quizId).slice(-6)}_${String(userId).slice(-6)}_${Date.now().toString().slice(-6)}`;

const isMockMarketplaceOrder = (orderId) => String(orderId || '').startsWith('mock_quiz_');

const createOrder = async (req, res) => {
  try {
    const { quizId } = req.body;
    const userId = req.user._id;

    if (!quizId) {
      return paymentError(res, 400, 'VALIDATION_ERROR', 'Please provide quizId', req.correlationId);
    }

    const quiz = await getQuizForPayment(quizId);
    if (!quiz) {
      return paymentError(res, 404, 'QUIZ_NOT_FOUND', 'Quiz not found', req.correlationId);
    }

    if (!quiz.isPaid || Number(quiz.price || 0) <= 0) {
      return paymentError(res, 400, 'QUIZ_NOT_PAID', 'Quiz is not configured as a paid quiz', req.correlationId);
    }

    const existingPayment = await Payment.findOne({
      userId,
      quizId,
      status: 'completed',
    }).lean();

    if (existingPayment) {
      return paymentError(res, 409, 'PAYMENT_EXISTS', 'Payment already completed for this quiz', req.correlationId, {
        paymentId: existingPayment._id,
      });
    }

    const hostAccount = await HostAccount.findOne({
      hostUserId: quiz.hostId,
    }).lean();

    // Get host's current plan (from subscription, defaults to FREE)
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
      if (hostAccount?.accountStatus === 'active' && hostAccount.linkedAccountId) {
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
      // Use PaymentRouter for gateway routing with failover support
      routingResult = await paymentRouter.routeCreateOrder(options);
      razorpayOrder = { id: routingResult.id };
    } catch (error) {
      if (config.mockPaymentsEnabled) {
        logger.warn('Falling back to mock marketplace order', {
          quizId,
          userId,
          reason: error.message,
        });
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
      // Gateway tracking fields (Requirements 6.1, 6.2)
      gatewayUsed: routingResult?.gatewayUsed || null,
      attemptCount: routingResult?.routingMetadata?.totalAttempts || 1,
      fallbackReason: routingResult?.routingMetadata?.usedFallback 
        ? (routingResult?.routingMetadata?.failedAttempts?.[0]?.error || 'Primary gateway unavailable')
        : null,
      routingMetadata: routingResult?.routingMetadata || null,
    });

    logger.info('Marketplace payment order created', {
      orderId: razorpayOrder.id,
      quizId,
      userId,
      hostPlan,
      grossAmount: split.grossAmount,
      hostAmount: split.hostAmount,
      commissionPercent,
      payoutMode,
    });

    res.status(201).json({
      success: true,
      data: {
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
      },
    });
  } catch (error) {
    if (error.code === 'PAYMENTS_DISABLED') {
      return paymentError(res, 503, 'PAYMENTS_DISABLED', 'Payment operations are disabled in this environment', req.correlationId);
    }
    logger.error('Create order error', { error: error.message, stack: error.stack });
    return paymentError(res, 500, 'SERVER_ERROR', 'Error creating payment order', req.correlationId);
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    if (!orderId || !paymentId || !signature) {
      return paymentError(res, 400, 'VALIDATION_ERROR', 'Please provide orderId, paymentId, and signature', req.correlationId);
    }

    const payment = await Payment.findOne({ razorpayOrderId: orderId });
    if (!payment) {
      return paymentError(res, 404, 'PAYMENT_NOT_FOUND', 'Payment record not found', req.correlationId);
    }

    // Idempotency: if this payment was already completed with the same paymentId, return success
    if (payment.status === 'completed' && payment.razorpayPaymentId === paymentId) {
      logger.info('Duplicate verifyPayment – already completed, returning cached result', { orderId, paymentId });
      return res.status(200).json({
        success: true,
        data: {
          paymentId: payment._id,
          razorpayPaymentId: paymentId,
          status: 'completed',
          payoutMode: payment.payoutMode,
          payoutStatus: payment.payoutStatus,
          split: {
            platformFeeAmount: payment.platformFeeAmount,
            hostAmount: payment.hostAmount,
          },
        },
      });
    }

    const isMockMode = config.mockPaymentsEnabled && isMockMarketplaceOrder(orderId);

    if (!isMockMode) {
      // Verify HMAC signature (timing-safe)
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const sig1 = Buffer.from(signature, 'hex');
      const sig2 = Buffer.from(generatedSignature, 'hex');
      if (sig1.length !== sig2.length || !crypto.timingSafeEqual(sig1, sig2)) {
        logger.error('Payment verification failed – invalid signature', { orderId, paymentId });
        return paymentError(res, 400, 'INVALID_SIGNATURE', 'Payment verification failed. Invalid signature', req.correlationId);
      }
    }

    let paymentDetails = null;
    try {
      paymentDetails = await razorpay.payments.fetch(paymentId);
    } catch (fetchError) {
      if (!isMockMode) {
        logger.warn('Unable to fetch payment details from Razorpay', { paymentId, error: fetchError.message });
      }
    }

    // Atomic update — only transition if currently not completed (prevents race on double-click)
    const updated = await Payment.findOneAndUpdate(
      { razorpayOrderId: orderId, status: { $ne: 'completed' } },
      {
        $set: {
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
          status: 'completed',
          gatewayFeeAmount: toRupees(paymentDetails?.fee || 0),
          taxAmount: toRupees(paymentDetails?.tax || 0),
        },
      },
      { new: true }
    );

    if (!updated) {
      // Race: another request completed it first — still return success
      logger.info('verifyPayment – concurrent completion detected, returning existing record', { orderId });
      return res.status(200).json({
        success: true,
        data: { paymentId: payment._id, razorpayPaymentId: paymentId, status: 'completed' },
      });
    }

    logger.info('Payment verified and completed', {
      paymentId,
      orderId,
      mode: isMockMode ? 'mock' : 'gateway',
      payoutMode: updated.payoutMode,
      payoutStatus: updated.payoutStatus,
    });

    return res.status(200).json({
      success: true,
      data: {
        paymentId: updated._id,
        razorpayPaymentId: paymentId,
        status: 'completed',
        payoutMode: updated.payoutMode,
        payoutStatus: updated.payoutStatus,
      },
    });
  } catch (error) {
    if (error.code === 'PAYMENTS_DISABLED') {
      return paymentError(res, 503, 'PAYMENTS_DISABLED', 'Payment operations are disabled in this environment', req.correlationId);
    }
    logger.error('Verify payment error', { error: error.message, stack: error.stack });
    return paymentError(res, 500, 'SERVER_ERROR', 'Error verifying payment', req.correlationId);
  }
};

const getPaymentStatus = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user._id;

    const payment = await Payment.findOne({
      userId,
      quizId,
      status: 'completed',
    }).lean();

    if (!payment) {
      return res.status(200).json({
        success: true,
        data: { paid: false },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        paid: true,
        paymentId: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        paidAt: payment.updatedAt,
        split: {
          platformFeeAmount: payment.platformFeeAmount,
          hostAmount: payment.hostAmount,
          payoutMode: payment.payoutMode,
          payoutStatus: payment.payoutStatus,
        },
      },
    });
  } catch (error) {
    logger.error('Get payment status error', { error: error.message, stack: error.stack });
    return paymentError(res, 500, 'SERVER_ERROR', 'Error fetching payment status', req.correlationId);
  }
};

const getBatchPaymentStatus = async (req, res) => {
  try {
    const { quizIds } = req.body;
    const userId = req.user._id;

    if (!quizIds || !Array.isArray(quizIds)) {
      return paymentError(res, 400, 'VALIDATION_ERROR', 'Please provide quizIds array', req.correlationId);
    }

    const payments = await Payment.find({
      userId,
      quizId: { $in: quizIds },
      status: 'completed',
    }).select('quizId amount currency updatedAt').lean();

    const statusMap = {};
    for (const quizId of quizIds) {
      statusMap[quizId] = { paid: false };
    }
    for (const payment of payments) {
      statusMap[payment.quizId.toString()] = {
        paid: true,
        paymentId: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        paidAt: payment.updatedAt,
      };
    }

    return res.status(200).json({ success: true, data: statusMap });
  } catch (error) {
    logger.error('Batch payment status error', { error: error.message, stack: error.stack });
    return paymentError(res, 500, 'SERVER_ERROR', 'Error fetching batch payment status', req.correlationId);
  }
};

const upsertHostAccount = async (req, res) => {
  try {
    const { linkedAccountId, accountStatus, settlementMode, bankLast4, ifsc } = req.body;

    if (!linkedAccountId || !String(linkedAccountId).trim()) {
      return paymentError(res, 400, 'VALIDATION_ERROR', 'linkedAccountId is required', req.correlationId);
    }

    const hostUserId = req.user._id;
    const update = {
      linkedAccountId: String(linkedAccountId).trim(),
      accountStatus: accountStatus || 'pending_kyc',
      settlementMode: settlementMode || 'scheduled',
      bankLast4: bankLast4 || '',
      ifsc: ifsc || '',
    };

    const hostAccount = await HostAccount.findOneAndUpdate(
      { hostUserId },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return res.status(200).json({
      success: true,
      data: hostAccount,
    });
  } catch (error) {
    logger.error('Upsert host account error', { error: error.message, stack: error.stack });
    return paymentError(res, 500, 'SERVER_ERROR', 'Unable to save host account', req.correlationId);
  }
};

const getMyHostAccount = async (req, res) => {
  try {
    const hostAccount = await HostAccount.findOne({ hostUserId: req.user._id }).lean();
    return res.status(200).json({
      success: true,
      data: hostAccount || null,
    });
  } catch (error) {
    logger.error('Get host account error', { error: error.message, stack: error.stack });
    return paymentError(res, 500, 'SERVER_ERROR', 'Unable to fetch host account', req.correlationId);
  }
};

const getHostPayoutSummary = async (req, res) => {
  try {
    const hostUserId = req.user._id;

    const summary = await Payment.aggregate([
      {
        $match: {
          hostUserId: new mongoose.Types.ObjectId(hostUserId),
          status: 'completed',
        },
      },
      {
        $group: {
          _id: '$payoutStatus',
          total: { $sum: '$hostAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const totals = {
      pending: 0,
      processing: 0,
      transferred: 0,
      blocked_kyc: 0,
      reversed: 0,
      failed: 0,
    };

    summary.forEach((item) => {
      if (totals[item._id] !== undefined) totals[item._id] = Number(item.total.toFixed(2));
    });

    const recent = await Payment.find({ hostUserId, status: 'completed' })
      .sort({ updatedAt: -1 })
      .limit(25)
      .select('quizId amount hostAmount platformFeeAmount payoutMode payoutStatus updatedAt')
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        totals,
        recent,
      },
    });
  } catch (error) {
    logger.error('Get host payout summary error', { error: error.message, stack: error.stack });
    return paymentError(res, 500, 'SERVER_ERROR', 'Unable to fetch payout summary', req.correlationId);
  }
};

const reconcileCapturedPayment = async (paymentEntity) => {
  const orderId = paymentEntity.order_id;
  const paymentId = paymentEntity.id;

  // Atomic idempotent update — $setOnInsert would only apply on insert;
  // here we use $set with a status guard so repeated webhook deliveries are no-ops
  const updated = await Payment.findOneAndUpdate(
    { razorpayOrderId: orderId, status: { $ne: 'completed' } },
    {
      $set: {
        razorpayPaymentId: paymentId,
        status: 'completed',
        gatewayFeeAmount: toRupees(paymentEntity.fee || 0),
        taxAmount: toRupees(paymentEntity.tax || 0),
      },
    },
    { new: true }
  );

  if (!updated) {
    // Already completed — idempotent no-op
    logger.info('reconcileCapturedPayment: payment already completed, skipping', { orderId, paymentId });
    return;
  }

  if (updated.payoutMode === 'route' && updated.hostAmount > 0) {
    updated.payoutStatus = updated.razorpayTransferId ? 'transferred' : 'processing';
    await updated.save();
  }

  logger.info('reconcileCapturedPayment: completed', { orderId, paymentId });
};

const handleWebhook = async (req, res) => {
  // Razorpay expects a 200 quickly — ack first, then process (for idempotency we must check before acking)
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.error('WEBHOOK_SECRET is not configured');
      return res.status(500).json({ error: { code: 'CONFIGURATION_ERROR', message: 'Webhook secret not configured' } });
    }

    if (!webhookSignature) {
      logger.error('Webhook signature missing');
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Webhook signature missing' } });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(buildWebhookSignaturePayload(req))
      .digest('hex');

    // Timing-safe comparison prevents timing oracle attacks
    const sigBuffer = Buffer.from(webhookSignature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const signaturesMatch = sigBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(sigBuffer, expectedBuffer);

    if (!signaturesMatch) {
      logger.error('Invalid webhook signature');
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid webhook signature' } });
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload?.payment?.entity;

    // Idempotency key: event type + payment/order ID
    const idempotencyKey = `${event}:${paymentEntity?.id || paymentEntity?.order_id || 'unknown'}`;

    logger.info('Webhook received', { event, idempotencyKey, orderId: paymentEntity?.order_id });

    // Acknowledge immediately — Razorpay retries on non-200
    res.status(200).json({ success: true });

    // Process asynchronously after ack
    try {
      if (event === 'payment.captured' && paymentEntity) {
        await reconcileCapturedPayment(paymentEntity);
      } else if (event === 'payment.failed' && paymentEntity) {
        // Idempotent: only update if not already failed/completed
        await Payment.findOneAndUpdate(
          { razorpayOrderId: paymentEntity.order_id, status: { $nin: ['completed', 'failed'] } },
          {
            $set: {
              razorpayPaymentId: paymentEntity.id,
              status: 'failed',
              payoutStatus: 'failed',
            },
          }
        );
      } else if (event === 'payment.refunded' && paymentEntity) {
        await Payment.findOneAndUpdate(
          {
            razorpayPaymentId: paymentEntity.id,
            status: { $in: ['completed', 'refunded'] },
          },
          {
            $set: {
              status: 'refunded',
              payoutStatus: 'reversed',
              refundAmount: toRupees(paymentEntity.amount_refunded || paymentEntity.amount || 0),
              refundedAt: new Date(),
            },
          }
        );
      } else if (event === 'transfer.processed' || event === 'transfer.failed') {
        const transferEntity = req.body.payload?.transfer?.entity;
        if (transferEntity?.id) {
          await Payment.findOneAndUpdate(
            {
              $or: [
                { razorpayOrderId: transferEntity.notes?.orderId },
                { razorpayTransferId: transferEntity.id },
              ],
            },
            {
              $set: {
                razorpayTransferId: transferEntity.id,
                payoutStatus: event === 'transfer.processed' ? 'transferred' : 'failed',
              },
            }
          );
        }
      }
    } catch (processingError) {
      logger.error('Webhook post-ack processing failed', {
        event,
        idempotencyKey,
        error: processingError.message,
        stack: processingError.stack,
      });
      // Store failed job for retry/alerting
      await FailedJob.findOneAndUpdate(
        { idempotencyKey },
        {
          $setOnInsert: {
            type: 'webhook',
            payload: req.body,
            idempotencyKey,
          },
          $set: {
            error: { message: processingError.message, stack: processingError.stack },
            status: 'pending',
          },
          $inc: { attempts: 1 },
        },
        { upsert: true }
      ).catch(err => logger.error('Failed to log FailedJob', { error: err.message }));
    }
  } catch (error) {
    logger.error('Webhook handler error', { error: error.message, stack: error.stack });
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Error processing webhook' } });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentStatus,
  getBatchPaymentStatus,
  handleWebhook,
  upsertHostAccount,
  getMyHostAccount,
  getHostPayoutSummary,
  computeSplit,
  buildMarketplaceReceipt,
  buildWebhookSignaturePayload,
};
