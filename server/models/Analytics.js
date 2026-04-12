const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['quiz', 'user'],
        required: true,
        index: true,
    },
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        default: null,
        index: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true,
    },
    payload: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    generatedAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
}, { timestamps: true });

AnalyticsSchema.index({ type: 1, quizId: 1, userId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Analytics', AnalyticsSchema);
