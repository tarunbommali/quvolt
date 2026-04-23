const mongoose = require('mongoose');

/**
 * AnalyticsEvent
 * Durable event store for real-time analytics.
 * Acts as a queue to decouple socket ingestion from DB aggregation.
 */
const AnalyticsEventSchema = new mongoose.Schema(
    {
        sessionId: { type: String, required: true, index: true },
        type: { type: String, required: true }, // e.g., 'ANSWER_SUBMITTED', 'SESSION_ENDED'
        payload: { type: mongoose.Schema.Types.Mixed },
        processed: { type: Boolean, default: false, index: true },
        sequenceNumber: { type: Number, index: true },
        // For debugging and drift analysis
        serverTime: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

module.exports = mongoose.model('AnalyticsEvent', AnalyticsEventSchema);
