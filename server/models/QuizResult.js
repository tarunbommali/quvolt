const mongoose = require('mongoose');

/**
 * QuizResult — Per-quiz, per-user result record.
 *
 * Existing Submission model tracks per-question answers.
 * This model captures the final aggregated result per user per quiz per blitz session,
 * enabling efficient leaderboard aggregation without touching existing collections.
 *
 * unitId and folderId are populated for folder-blitz sessions.
 */
const QuizResultSchema = new mongoose.Schema({
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',        required: true },
    quizId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz',        required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'BlitzSession', required: true },

    // Folder-blitz hierarchy context (null for single blitz)
    unitId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz',        default: null },
    folderId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz',        default: null },

    score:     { type: Number, required: true, min: 0, default: 0 },
    attempt:   { type: Number, default: 1, min: 1 },
}, { timestamps: true });

// ── Compound index for the leaderboard aggregation pipeline ─────────────────
QuizResultSchema.index({ sessionId: 1, userId: 1, unitId: 1 });
QuizResultSchema.index({ sessionId: 1, quizId: 1, userId: 1 });
QuizResultSchema.index({ userId: 1, sessionId: 1 });

module.exports = mongoose.model('QuizResult', QuizResultSchema);
