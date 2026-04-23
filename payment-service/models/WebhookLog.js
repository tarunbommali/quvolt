const mongoose = require('mongoose');

const webhookLogSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  eventType: {
    type: String,
    required: true
  },
  source: {
    type: String,
    enum: ['razorpay'],
    default: 'razorpay'
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processed', 'failed', 'ignored'],
    default: 'pending'
  },
  error: {
    type: String,
    default: null
  },
  processedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Auto-delete logs older than 30 days
webhookLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('WebhookLog', webhookLogSchema);
