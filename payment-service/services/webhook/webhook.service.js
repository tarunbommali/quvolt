const Payment = require('../../models/Payment');
const FailedJob = require('../../models/FailedJob');
const logger = require('../../utils/logger');
const { toRupees } = require('../payment/split.service');

const reconcileCapturedPayment = async (paymentEntity) => {
  const orderId = paymentEntity.order_id;
  const paymentId = paymentEntity.id;

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
    logger.info('reconcileCapturedPayment: payment already completed, skipping', { orderId, paymentId });
    return;
  }

  if (updated.payoutMode === 'route' && updated.hostAmount > 0) {
    updated.payoutStatus = updated.razorpayTransferId ? 'transferred' : 'processing';
    await updated.save();
  }

  logger.info('reconcileCapturedPayment: completed', { orderId, paymentId });
};

const handlePaymentFailed = async (paymentEntity) => {
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
};

const handlePaymentRefunded = async (paymentEntity) => {
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
};

const handleTransferUpdate = async (transferEntity, event) => {
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
};

const handleSubscriptionCharged = async (subscriptionEntity) => {
  const { createSubscription } = require('../subscription/subscription.service');
  const hostId = subscriptionEntity.notes?.hostId;
  const planId = subscriptionEntity.notes?.planId;
  const paymentId = subscriptionEntity.payment_id;

  if (hostId && planId) {
    await createSubscription(hostId, planId, paymentId);
    logger.info('handleSubscriptionCharged: processed', { hostId, planId, paymentId });
  }
};

const handleSubscriptionCancelled = async (subscriptionEntity) => {
  const Subscription = require('../../models/Subscription');
  const hostId = subscriptionEntity.notes?.hostId;

  if (hostId) {
    await Subscription.updateMany(
      { hostId, status: 'active' },
      { $set: { status: 'cancelled', cancelledAt: new Date() } }
    );
    logger.info('handleSubscriptionCancelled: processed', { hostId });
  }
};

const logFailedWebhookJob = async (idempotencyKey, payload, error) => {
  await FailedJob.findOneAndUpdate(
    { idempotencyKey },
    {
      $setOnInsert: {
        type: 'webhook',
        payload,
        idempotencyKey,
      },
      $set: {
        error: { message: error.message, stack: error.stack },
        status: 'pending',
      },
      $inc: { attempts: 1 },
    },
    { upsert: true }
  ).catch(err => logger.error('Failed to log FailedJob', { error: err.message }));
};

module.exports = {
  reconcileCapturedPayment,
  handlePaymentFailed,
  handlePaymentRefunded,
  handleTransferUpdate,
  handleSubscriptionCharged,
  handleSubscriptionCancelled,
  logFailedWebhookJob
};
