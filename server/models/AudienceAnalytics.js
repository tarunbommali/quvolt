const mongoose = require('mongoose');

/**
 * AudienceAnalytics
 * Device breakdown and participation timeline per session.
 * One document per session, upserted on session-end.
 */
const AudienceAnalyticsSchema = new mongoose.Schema(
    {
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'QuizSession',
            required: true,
            unique: true,
            index: true,
        },
        hostId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        deviceBreakdown: {
            mobile: { type: Number, default: 0 },
            desktop: { type: Number, default: 0 },
            tablet: { type: Number, default: 0 },
        },
        /**
         * Hourly or per-question-step join counts over the session lifetime.
         * [ { label: '14:00', count: 45 }, ... ]
         */
        participationTimeline: [
            {
                label: { type: String },
                count: { type: Number, default: 0 },
            },
        ],
        retentionRate: { type: Number, default: 0 }, // % participants who stayed until end
        peakParticipants: { type: Number, default: 0 },
    },
    { timestamps: true },
);

module.exports = mongoose.model('AudienceAnalytics', AudienceAnalyticsSchema);
