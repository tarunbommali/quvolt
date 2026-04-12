const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    plan: {
      type: String,
      enum: ['FREE', 'PRO', 'PREMIUM'],
      default: 'FREE'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'paused', 'expired', 'replaced'],
      default: 'inactive'
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    },
    participantLimit: {
      type: Number,
      default: 10000,
      min: 0
    },
    commission: {
      type: Number,
      default: 0.25,
      min: 0
    },
    razorpaySubscriptionId: {
      type: String,
      sparse: true,
      unique: true,
      default: null
    },
    razorpayPlanId: {
      type: String,
      sparse: true,
      default: null
    },
    currentCycleStart: Date,
    currentCycleEnd: Date,
    expiryDate: {
      type: Date,
      default: null
    },
    autoRenew: {
      type: Boolean,
      default: true
    },
    monthlyAmount: {
      type: Number,
      default: 0
    },
    commissionPercent: {
      type: Number,
      default: 25
    },
    paidCycles: {
      type: Number,
      default: 0
    },
    failedPaymentCount: {
      type: Number,
      default: 0
    },
    // For tracking subscription history
    upgradeHistory: [{
      fromPlan: String,
      toPlan: String,
      upgradedAt: Date,
      reason: String
    }],
    cancellationReason: String,
    cancelledAt: Date
  },
  { timestamps: true }
);

// Index for active subscriptions per host
subscriptionSchema.index({ hostId: 1, status: 1, expiryDate: 1 });
subscriptionSchema.index({ expiryDate: 1, status: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
