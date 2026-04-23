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

const handleSubscriptionCharged = async (subscriptionEntity, paymentId) => {
  const Subscription = require('../../models/Subscription');
  const { processSubscriptionPayment, createSubscription } = require('../subscription/subscription.service');
  
  const razorpaySubId = subscriptionEntity.id;
  const hostId = subscriptionEntity.notes?.hostId;
  const planId = subscriptionEntity.notes?.planId;
  const amount = toRupees(subscriptionEntity.paid_amount || 0);

  // Find existing subscription by Razorpay ID
  const subscription = await Subscription.findOne({ razorpaySubscriptionId: razorpaySubId });

  if (subscription) {
    // If it exists, this is a recurring charge
    await processSubscriptionPayment(subscription._id, paymentId, amount);
    logger.info('handleSubscriptionCharged: extended existing subscription', { razorpaySubId, hostId });
  } else if (hostId && planId) {
    // If not, this might be the first charge for a new subscription
    await createSubscription(hostId, planId, paymentId);
    // Update the subscription with the Razorpay ID if it was just created
    await Subscription.findOneAndUpdate(
      { hostId, plan: planId, status: 'active' },
      { $set: { razorpaySubscriptionId: razorpaySubId } }
    );
    logger.info('handleSubscriptionCharged: created new subscription record', { hostId, planId });
  }
};

const handleSubscriptionCancelled = async (subscriptionEntity) => {
  const Subscription = require('../../models/Subscription');
  const razorpaySubId = subscriptionEntity.id;

  if (razorpaySubId) {
    const updated = await Subscription.findOneAndUpdate(
      { razorpaySubscriptionId: razorpaySubId, status: 'active' },
      { 
        $set: { 
          status: 'cancelled', 
          cancelledAt: new Date(),
          autoRenew: false
        } 
      },
      { new: true }
    );
    
    if (updated) {
      logger.info('handleSubscriptionCancelled: processed', { razorpaySubId, hostId: updated.hostId });
    }
  }
};

const handleSubscriptionCompleted = async (subscriptionEntity) => {
  const Subscription = require('../../models/Subscription');
  const razorpaySubId = subscriptionEntity.id;

  if (razorpaySubId) {
    await Subscription.findOneAndUpdate(
      { razorpaySubscriptionId: razorpaySubId },
      { $set: { status: 'expired' } }
    );
    logger.info('handleSubscriptionCompleted: marked as expired', { razorpaySubId });
  }
};

const handleInvoicePaid = async (invoiceEntity) => {
  const Payment = require('../../models/Payment');
  const Subscription = require('../../models/Subscription');
  
  const razorpayInvoiceId = invoiceEntity.id;
  const razorpaySubId = invoiceEntity.subscription_id;
  const amount = toRupees(invoiceEntity.amount_paid || 0);
  const paymentId = invoiceEntity.payment_id;

  if (razorpaySubId) {
    const subscription = await Subscription.findOne({ razorpaySubscriptionId: razorpaySubId });
    if (subscription) {
      // Create a payment record for the invoice
      await Payment.create({
        userId: subscription.hostId,
        paymentType: 'subscription',
        subscriptionId: subscription._id,
        amount: amount,
        grossAmount: amount,
        razorpayOrderId: invoiceEntity.order_id || `inv_order_${razorpayInvoiceId}`,
        razorpayPaymentId: paymentId,
        status: 'completed',
        metadata: { razorpayInvoiceId, razorpaySubId }
      });
      logger.info('handleInvoicePaid: stored billing record', { razorpayInvoiceId, razorpaySubId });
    }
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

const handleOrderPaid = async (orderEntity) => {
  const Payment = require('../../models/Payment');
  const razorpayOrderId = orderEntity.id;

  if (orderEntity.status === 'paid') {
    // This usually matches a payment.captured, but we can use it as a fallback
    // reconciliation if needed. For now just log.
    logger.info('handleOrderPaid: backup reconciliation triggered', { razorpayOrderId });
  }
};

module.exports = {
  reconcileCapturedPayment,
  handlePaymentFailed,
  handlePaymentRefunded,
  handleTransferUpdate,
  handleSubscriptionCharged,
  handleSubscriptionCancelled,
  handleSubscriptionCompleted,
  handleInvoicePaid,
  handleOrderPaid,
  logFailedWebhookJob
};
