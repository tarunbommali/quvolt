const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  paymentType: {
    type: String,
    enum: ['quiz', 'subscription'],
    default: 'quiz'
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: false // Optional for subscription payments
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
  platformFeeAmount: {
    type: Number,
    default: 0,
    min: [0, 'Platform fee cannot be negative']
  },
  hostAmount: {
    type: Number,
    default: 0,
    min: [0, 'Host amount cannot be negative']
  },
  hostUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  hostLinkedAccountId: {
    type: String,
    trim: true,
    default: null
  },
  payoutMode: {
    type: String,
    enum: ['route', 'manual', 'none'],
    default: 'none'
  },
  payoutStatus: {
    type: String,
    enum: ['not_applicable', 'pending', 'processing', 'transferred', 'blocked_kyc', 'reversed', 'failed'],
    default: 'not_applicable'
  },
  razorpayTransferId: {
    type: String,
    trim: true,
    default: null
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

paymentSchema.path('quizId').index(true);
paymentSchema.path('userId').index(true);

paymentSchema.pre('validate', function normalizeAmount(next) {
  if (typeof this.amount === 'number') {
    this.amount = Number(this.amount.toFixed(2));
  }
  next();
});

// Indexes
paymentSchema.index({ userId: 1, quizId: 1 });
// Sparse unique ensures no two completed payment records share the same Razorpay payment ID
paymentSchema.index({ razorpayPaymentId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ hostUserId: 1, status: 1, payoutStatus: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ hostUserId: 1, createdAt: -1 }); // Revenue queries

module.exports = mongoose.model('Payment', paymentSchema);
