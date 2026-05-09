const mongoose = require('mongoose');

/**
 * BlitzSession — Unified session model for Single and Folder-based quiz blitzes.
 *
 * Single Blitz: one quiz, one leaderboard.
 * Folder Blitz: a folder (subject) containing multiple quizzes (units → quizzes),
 *               with aggregated scoring computed dynamically via MongoDB pipeline.
 */
const BlitzSessionSchema = new mongoose.Schema({
    hostId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },

    // ── Mode ────────────────────────────────────────────────────────────────
    type: {
        type: String,
        enum: ['single', 'folder'],
        required: true,
    },

    // Single blitz → quizId required
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        default: null,
    },

    // Folder blitz → folderId (Quiz with type: 'subject') required
    folderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        default: null,
    },

    // ── Status ──────────────────────────────────────────────────────────────
    status: {
        type: String,
        enum: ['waiting', 'live', 'ended'],
        default: 'waiting',
        index: true,
    },

    // ── Participants (registered user IDs) ──────────────────────────────────
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],

    // ── Timing ──────────────────────────────────────────────────────────────
    startedAt: { type: Date, default: null },
    endedAt:   { type: Date, default: null },

    leaderboardSnapshot: {
        type: Array,
        default: null,
    },
    
    // ── Configuration Snapshot ──────────────────────────────────────────────
    templateConfig: {
        type: Object,
        default: null,
    },
}, { timestamps: true });

// ── Validation ───────────────────────────────────────────────────────────────
BlitzSessionSchema.pre('validate', function () {
    if (this.type === 'single' && !this.quizId) {
        this.invalidate('quizId', 'quizId is required for single blitz');
    }
    if (this.type === 'folder' && !this.folderId) {
        this.invalidate('folderId', 'folderId is required for folder blitz');
    }
});

// ── Indexes ──────────────────────────────────────────────────────────────────
BlitzSessionSchema.index({ hostId: 1, createdAt: -1 });
BlitzSessionSchema.index({ quizId: 1, status: 1 });
BlitzSessionSchema.index({ folderId: 1, status: 1 });

module.exports = mongoose.model('BlitzSession', BlitzSessionSchema);
