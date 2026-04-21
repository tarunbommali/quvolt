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
    if (!crypto.timingSafeEqual(Buffer.from(webhookSignature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
      logger.error('Invalid webhook signature');
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid webhook signature' } });
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload?.payment?.entity;
    const idempotencyKey = `${event}:${paymentEntity?.id || paymentEntity?.order_id || 'unknown'}`;

    res.status(200).json({ success: true });

    // Background processing
    try {
      if (event === 'payment.captured') await webhookService.reconcileCapturedPayment(paymentEntity);
      else if (event === 'payment.failed') await webhookService.handlePaymentFailed(paymentEntity);
      else if (event === 'payment.refunded') await webhookService.handlePaymentRefunded(paymentEntity);
      else if (event.startsWith('transfer.')) await webhookService.handleTransferUpdate(req.body.payload?.transfer?.entity, event);
    } catch (err) {
      logger.error('Webhook processing failed', { event, idempotencyKey, error: err.message });
      await webhookService.logFailedWebhookJob(idempotencyKey, req.body, err);
    }
  } catch (error) {
    logger.error('Webhook controller error', { error: error.message });
    if (!res.headersSent) res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Error processing webhook' } });
  }
};

module.exports = { handleWebhook };
