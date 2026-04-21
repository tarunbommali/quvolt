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
    const idempotencyKey = `webhook:${event}:${req.body.account_id || ''}:${req.body.created_at || Date.now()}`;

    res.status(200).json({ success: true });

    const { ensureIdempotent } = require('../utils/idempotency');

    // Background processing with Idempotency
    ensureIdempotent(idempotencyKey, async () => {
      try {
        if (event === 'payment.captured') await webhookService.reconcileCapturedPayment(payload?.payment?.entity);
        else if (event === 'payment.failed') await webhookService.handlePaymentFailed(payload?.payment?.entity);
        else if (event === 'payment.refunded') await webhookService.handlePaymentRefunded(payload?.payment?.entity);
        else if (event === 'subscription.charged') await webhookService.handleSubscriptionCharged(payload?.subscription?.entity);
        else if (event === 'subscription.cancelled') await webhookService.handleSubscriptionCancelled(payload?.subscription?.entity);
        else if (event.startsWith('transfer.')) await webhookService.handleTransferUpdate(payload?.transfer?.entity, event);
      } catch (err) {
        logger.error('Webhook processing failed', { event, idempotencyKey, error: err.message });
        await webhookService.logFailedWebhookJob(idempotencyKey, req.body, err);
        throw err;
      }
    }).catch(err => logger.error('Webhook idempotency wrapper failed', { error: err.message }));
  } catch (error) {
    logger.error('Webhook controller error', { error: error.message });
    if (!res.headersSent) res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Error processing webhook' } });
  }
};

module.exports = { handleWebhook };
