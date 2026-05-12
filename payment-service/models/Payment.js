const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  paymentType: {
    type: String,
    enum: ['subscription'],
    default: 'subscription'
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    default: null
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  grossAmount: {
    type: Number,
    default: 0,
    min: [0, 'Gross amount cannot be negative']
  },
  gatewayFeeAmount: {
    type: Number,
    default: 0,
    min: [0, 'Gateway fee cannot be negative']
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tax amount cannot be negative']
  },
  refundAmount: {
    type: Number,
    default: 0,
    min: [0, 'Refund amount cannot be negative']
  },
  refundedAt: {
    type: Date,
    default: null
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true,
    trim: true,
    enum: ['INR']
  },
  razorpayOrderId: {
    type: String,
    required: [true, 'Razorpay order ID is required'],
    unique: true,
    trim: true
  },
  razorpayPaymentId: {
    type: String,
    trim: true,
    default: null
  },
  razorpaySignature: {
    type: String,
    trim: true,
    default: null,
    select: false
  },
  status: {
    type: String,
    enum: ['created', 'authorized', 'completed', 'failed', 'refunded'],
    default: 'created'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Gateway tracking fields (Requirements 6.1, 6.2)
  gatewayUsed: {
    type: String,
    trim: true,
    default: null
  },
  attemptCount: {
    type: Number,
    default: 1,
    min: [1, 'Attempt count must be at least 1']
  },
  fallbackReason: {
    type: String,
    trim: true,
    default: null
  },
  routingMetadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, { timestamps: true });

paymentSchema.path('userId').index(true);

paymentSchema.pre('validate', function normalizeAmount(next) {
  if (typeof this.amount === 'number') {
    this.amount = Number(this.amount.toFixed(2));
  }
  next();
});

// Indexes
// Sparse unique ensures no two completed payment records share the same Razorpay payment ID
paymentSchema.index({ razorpayPaymentId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ status: 1 });
paymentSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
