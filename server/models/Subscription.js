const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: String, enum: ['FREE', 'CREATOR', 'TEAMS'], default: 'FREE' },
    status: {
        type: String,
        enum: ['active', 'inactive', 'cancelled', 'expired', 'paused', 'replaced'],
        default: 'inactive',
    },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    participantLimit: { type: Number, default: 10000, min: 0 },

    razorpaySubscriptionId: { type: String, sparse: true, unique: true, default: null },
    razorpayPlanId: { type: String, sparse: true, default: null },
    currentCycleStart: { type: Date, default: null },
    currentCycleEnd: { type: Date, default: null },
    expiryDate: { type: Date, default: null },
    autoRenew: { type: Boolean, default: true },
    monthlyAmount: { type: Number, default: 0, min: 0 },
    paidCycles: { type: Number, default: 0, min: 0 },
    failedPaymentCount: { type: Number, default: 0, min: 0 },
    upgradeHistory: [{
        fromPlan: String,
        toPlan: String,
        upgradedAt: Date,
        reason: String,
    }],
    cancellationReason: String,
    cancelledAt: Date,
}, { timestamps: true });

subscriptionSchema.index({ hostId: 1, status: 1, expiryDate: 1 });
subscriptionSchema.index({ expiryDate: 1, status: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
