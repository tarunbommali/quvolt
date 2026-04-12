const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const { handleSubscriptionExpiry } = require('../services/subscriptionService');
const logger = require('../utils/logger');

/**
 * Run subscription expiry check every hour
 * Automatically downgrades expired subscriptions to FREE plan
 */
function startSubscriptionExpiryJob() {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('Subscription expiry check started');

      const now = new Date();
      const expiredSubscriptions = await Subscription.find({
        status: 'active',
        expiryDate: { $lte: now },
      });

      for (const subscription of expiredSubscriptions) {
        try {
          await handleSubscriptionExpiry(subscription);
          logger.info('Subscription expired and downgraded', {
            subscriptionId: subscription._id,
            hostId: subscription.hostId,
            plan: subscription.plan,
          });
        } catch (err) {
          logger.error('Error handling subscription expiry', {
            subscriptionId: subscription._id,
            error: err.message,
          });
        }
      }

      logger.info(`Subscription expiry check completed. Processed ${expiredSubscriptions.length} expired subscriptions`);
    } catch (error) {
      logger.error('Subscription expiry job error', { error: error.message });
    }
  });

  logger.info('Subscription expiry cron job scheduled (every hour)');
}

/**
 * Run failed subscription payment retry every 6 hours
 */
function startFailedPaymentRetryJob() {
  cron.schedule('0 */6 * * *', async () => {
    try {
      logger.info('Failed subscription payment retry job started');

      // Find subscriptions with paused status due to failed payments
      const pausedSubscriptions = await Subscription.find({
        status: 'paused',
        failedPaymentCount: { $gte: 3 },
      });

      // Log for monitoring - in production, you'd retry billing here
      logger.info('Paused subscriptions detected for retry', {
        count: pausedSubscriptions.length,
      });

      // Notify admin/support for manual intervention
      if (pausedSubscriptions.length > 0) {
        logger.warn('Manual intervention needed for paused subscriptions', {
          count: pausedSubscriptions.length,
          subscriptionIds: pausedSubscriptions.map((s) => s._id),
        });
      }
    } catch (error) {
      logger.error('Failed payment retry job error', { error: error.message });
    }
  });

  logger.info('Failed subscription payment retry job scheduled (every 6 hours)');
}

/**
 * Send subscription renewal reminders
 * Email hosts 7 days before expiry
 */
function startSubscriptionReminderJob() {
  cron.schedule('0 9 * * *', async () => {
    try {
      logger.info('Subscription renewal reminder job started');

      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const expiringSubscriptions = await Subscription.find({
        status: 'active',
        expiryDate: { $lte: sevenDaysLater, $gt: now },
      }).populate('hostId', 'email name');

      logger.info(`Found ${expiringSubscriptions.length} subscriptions expiring in 7 days`);

      // In production, send emails here using a mail service
      for (const subscription of expiringSubscriptions) {
        logger.info('Subscription renewal reminder', {
          hostId: subscription.hostId._id,
          email: subscription.hostId.email,
          expiryDate: subscription.expiryDate,
          daysRemaining: Math.floor((subscription.expiryDate - now) / (24 * 60 * 60 * 1000)),
        });
      }
    } catch (error) {
      logger.error('Subscription reminder job error', { error: error.message });
    }
  });

  logger.info('Subscription renewal reminder job scheduled (daily at 9 AM)');
}

/**
 * Initialize all subscription cron jobs
 */
function initSubscriptionJobs() {
  startSubscriptionExpiryJob();
  startFailedPaymentRetryJob();
  startSubscriptionReminderJob();
  logger.info('All subscription cron jobs initialized');
}

module.exports = {
  initSubscriptionJobs,
  startSubscriptionExpiryJob,
  startFailedPaymentRetryJob,
  startSubscriptionReminderJob,
};
