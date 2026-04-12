const mongoose = require('mongoose');

/**
 * FailedJob — stores failed async operations for retry or alerting.
 * Covers: payout reconciliation failures, webhook mismatches, etc.
 */
const failedJobSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['webhook', 'payout', 'email', 'reconciliation', 'other'],
        index: true,
    },
    payload: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    error: {
        message: { type: String },
        code: { type: String },
        stack: { type: String },
    },
    attempts: {
        type: Number,
        default: 1,
        min: 1,
    },
    maxAttempts: {
        type: Number,
        default: 5,
    },
    nextRetryAt: {
        type: Date,
        default: null,
        index: true,
    },
    resolvedAt: {
        type: Date,
        default: null,
    },
    status: {
        type: String,
        enum: ['pending', 'retrying', 'resolved', 'dead_letter'],
        default: 'pending',
        index: true,
    },
    idempotencyKey: {
        type: String,
        sparse: true,
        index: true,
    },
}, { timestamps: true });

// Compound index for the retry worker query
failedJobSchema.index({ status: 1, nextRetryAt: 1 });

// Helper to compute exponential backoff delay in ms
failedJobSchema.methods.computeNextRetryMs = function () {
    const baseMs = 60_000; // 1 minute base
    return baseMs * Math.pow(2, this.attempts - 1); // 1m, 2m, 4m, 8m, 16m
};

module.exports = mongoose.model('FailedJob', failedJobSchema);
