const mongoose = require('mongoose');

/**
 * QuestionAnalytics
 * Per-question stats for a given session. One document per question per session.
 */
const QuestionAnalyticsSchema = new mongoose.Schema(
    {
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'QuizSession',
            required: true,
            index: true,
        },
        questionId: {
            type: mongoose.Schema.Types.Mixed, // supports ObjectId strings from snapshot
            required: true,
        },
        questionText: { type: String, default: '' },
        correctCount: { type: Number, default: 0 },
        incorrectCount: { type: Number, default: 0 },
        totalResponses: { type: Number, default: 0 },
        totalTime: { type: Number, default: 0 },       // cumulative seconds for all answers
        avgResponseTime: { type: Number, default: 0 }, // seconds
        dropOffRate: { type: Number, default: 0 },     // 0-100 %
        difficulty: { type: Number, default: 0 },       // 0-100 (higher = harder)
        qqsScore: { type: Number, default: 100 },       // 0-100 (Question Quality Score)
        explanation: { type: String, default: '' },     // Host-provided explanation
        
        // O(1) mapping of option -> count
        optionCounts: {
            type: Map,
            of: Number,
            default: {},
        },
        // Store which option is correct for frontend formatting
        correctOption: { type: String, default: null },
        
        // For backwards compatibility and fast reads (can be updated alongside optionCounts)
        optionDistribution: [
            {
                option: { type: String },
                count: { type: Number, default: 0 },
                isCorrect: { type: Boolean, default: false },
            },
        ],
    },
    { timestamps: true },
);

QuestionAnalyticsSchema.index({ sessionId: 1, questionId: 1 }, { unique: true });

module.exports = mongoose.model('QuestionAnalytics', QuestionAnalyticsSchema);
