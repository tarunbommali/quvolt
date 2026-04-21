const cron = require('node-cron');
const Payment = require('../models/Payment');
const HostAccount = require('../models/HostAccount');
const razorpay = require('../config/razorpay');
const logger = require('../utils/logger');
const { ensureIdempotent } = require('../utils/idempotency');

/**
 * Payout Processor Job
 * Scans for 'processing' payouts and attempts transfers to host linked accounts.
 */
async function processPendingPayouts() {
  try {
    logger.info('PayoutProcessor: scanning for processing payouts');

    const payments = await Payment.find({
      status: 'completed',
      payoutStatus: 'processing',
      payoutMode: 'route',
      hostAmount: { $gt: 0 },
      hostLinkedAccountId: { $ne: null }
    }).limit(50);

    if (payments.length === 0) return;

    logger.info(`PayoutProcessor: found ${payments.length} payouts to process`);

    for (const payment of payments) {
      const idempotencyKey = `payout:${payment._id}`;
      
      try {
        await ensureIdempotent(idempotencyKey, async () => {
          // Check if host account is verified
          const hostAccount = await HostAccount.findOne({ linkedAccountId: payment.hostLinkedAccountId });
          
          if (!hostAccount || hostAccount.accountStatus !== 'verified') {
            logger.warn('PayoutProcessor: host account not verified, blocking payout', { 
              paymentId: payment._id, 
              hostId: payment.hostUserId 
            });
            payment.payoutStatus = 'blocked_kyc';
            await payment.save();
            return;
          }

          // Execute transfer via Razorpay Route
          const transfer = await razorpay.transfers.create({
            account: payment.hostLinkedAccountId,
            amount: Math.round(payment.hostAmount * 100), // Convert to paise
            currency: payment.currency || 'INR',
            notes: {
              orderId: payment.razorpayOrderId,
              paymentId: payment._id.toString()
            }
          });

          payment.razorpayTransferId = transfer.id;
          payment.payoutStatus = 'transferred';
          await payment.save();

          logger.info('PayoutProcessor: transfer successful', { 
            paymentId: payment._id, 
            transferId: transfer.id 
          });
        });
      } catch (err) {
        logger.error('PayoutProcessor: transfer failed', { 
          paymentId: payment._id, 
          error: err.message 
        });
        
        // Don't change status to failed yet, let it retry next time
        // unless it's a specific non-retryable error
      }
    }
  } catch (error) {
    logger.error('PayoutProcessor: job error', { error: error.message });
  }
}

/**
 * Initialize payout job
 */
function initPayoutJob() {
  // Run every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    await processPendingPayouts();
  });
  logger.info('Payout automation job scheduled (every 10 minutes)');
}

module.exports = { initPayoutJob, processPendingPayouts };
