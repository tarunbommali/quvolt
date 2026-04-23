const mongoose = require('mongoose');

/**
 * SessionAnalytics
 * Aggregated analytics document per quiz session.
 * Written on session-end and updated incrementally on answer events.
 */
const SessionAnalyticsSchema = new mongoose.Schema(
    {
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'QuizSession',
            required: true,
            unique: true,
            index: true,
        },
        quizId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Quiz',
            required: true,
            index: true,
        },
        hostId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        totalParticipants: { type: Number, default: 0 },
        totalResponses: { type: Number, default: 0 },
        correctCount: { type: Number, default: 0 },
        avgScore: { type: Number, default: 0 },
        completionRate: { type: Number, default: 0 }, // 0-100
        topLeaderboard: [
            {
                userId: { type: mongoose.Schema.Types.ObjectId },
                name: { type: String },
                score: { type: Number },
                rank: { type: Number },
            },
        ],
        sessionDuration: { type: Number, default: 0 }, // seconds
        isFinalized: { type: Boolean, default: false },
    },
    { timestamps: true },
);

SessionAnalyticsSchema.index({ hostId: 1, createdAt: -1 });

module.exports = mongoose.model('SessionAnalytics', SessionAnalyticsSchema);
