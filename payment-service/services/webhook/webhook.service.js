const Payment = require('../../models/Payment');
const logger = require('../../utils/logger');

const reconcileCapturedPayment = async (paymentEntity) => {
  const orderId = paymentEntity.order_id;
  const paymentId = paymentEntity.id;

  const updated = await Payment.findOneAndUpdate(
    { razorpayOrderId: orderId, status: { $ne: 'completed' } },
    {
      $set: {
        razorpayPaymentId: paymentId,
        status: 'completed',
        gatewayFeeAmount: (paymentEntity.fee || 0) / 100,
        taxAmount: (paymentEntity.tax || 0) / 100,
      },
    },
    { new: true }
  );

  if (!updated) {
    logger.info('reconcileCapturedPayment: payment already completed, skipping', { orderId, paymentId });
    return;
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
        status: 'failed',
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
        status: 'refunded',
        refundAmount: (paymentEntity.amount_refunded || paymentEntity.amount || 0) / 100,
        refundedAt: new Date(),
      },
    }
  );
};



const handleSubscriptionCharged = async (subscriptionEntity, paymentId) => {
  const Subscription = require('../../models/Subscription');
  const { processSubscriptionPayment, createSubscription } = require('../subscription/subscription.service');
  
  const razorpaySubId = subscriptionEntity.id;
  const hostId = subscriptionEntity.notes?.hostId;
  const planId = subscriptionEntity.notes?.planId;
  const amount = (subscriptionEntity.paid_amount || 0) / 100;

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
  const amount = (invoiceEntity.amount_paid || 0) / 100;
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
  handleSubscriptionCharged,
  handleSubscriptionCancelled,
  handleSubscriptionCompleted,
  handleInvoicePaid,
  handleOrderPaid
};
