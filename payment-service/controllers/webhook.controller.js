const crypto = require('crypto');
const logger = require('../utils/logger');
const webhookService = require('../services/webhook/webhook.service');

const buildWebhookSignaturePayload = (req) => {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody;
  return Buffer.from(JSON.stringify(req.body || {}), 'utf8');
};

const handleWebhook = async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (!webhookSecret || !webhookSignature) {
      logger.error('Webhook auth missing', { secret: !!webhookSecret, sig: !!webhookSignature });
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Webhook authentication failed' } });
    }

    const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(buildWebhookSignaturePayload(req)).digest('hex');
    
    const sig1 = Buffer.from(webhookSignature, 'hex');
    const sig2 = Buffer.from(expectedSignature, 'hex');

    if (sig1.length !== sig2.length || !crypto.timingSafeEqual(sig1, sig2)) {
      logger.error('Invalid webhook signature');
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid webhook signature' } });
    }

    const event = req.body.event;
    const payload = req.body.payload;
    const eventId = req.body.id || `evt_${Date.now()}`;

    // Acknowledge receipt immediately
    res.status(200).json({ success: true });

    const WebhookLog = require('../models/WebhookLog');

    // Idempotency check using WebhookLog
    const existingLog = await WebhookLog.findOne({ eventId });
    if (existingLog && existingLog.status === 'processed') {
      logger.info('Webhook already processed, skipping', { eventId });
      return;
    }

    const log = await WebhookLog.findOneAndUpdate(
      { eventId },
      { 
        $setOnInsert: { eventId, eventType: event, payload: req.body, status: 'pending' } 
      },
      { upsert: true, new: true }
    );

    try {
      if (event === 'payment.captured') await webhookService.reconcileCapturedPayment(payload?.payment?.entity);
      else if (event === 'payment.failed') await webhookService.handlePaymentFailed(payload?.payment?.entity);
      else if (event === 'payment.refunded') await webhookService.handlePaymentRefunded(payload?.payment?.entity);
      else if (event === 'subscription.charged') await webhookService.handleSubscriptionCharged(payload?.subscription?.entity, payload?.payment?.entity?.id);
      else if (event === 'subscription.cancelled') await webhookService.handleSubscriptionCancelled(payload?.subscription?.entity);
      else if (event === 'subscription.completed') await webhookService.handleSubscriptionCompleted(payload?.subscription?.entity);
      else if (event === 'invoice.paid') await webhookService.handleInvoicePaid(payload?.invoice?.entity);
      else if (event === 'order.paid') await webhookService.handleOrderPaid(payload?.order?.entity);

      log.status = 'processed';
      log.processedAt = new Date();
      await log.save();
    } catch (err) {
      logger.error('Webhook processing failed', { event, eventId, error: err.message });
      log.status = 'failed';
      log.error = err.message;
      await log.save();
    }
  } catch (error) {
    logger.error('Webhook controller error', { error: error.message });
    if (!res.headersSent) res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Error processing webhook' } });
  }
};

module.exports = { handleWebhook };
