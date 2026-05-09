const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * QuizTemplate — Session Configuration Document
 *
 * Defines the full engine config for a quiz session.
 * ALWAYS snapshot this into QuizSession.templateConfig on session start.
 * NEVER reference a live template from a running session.
 */
const QuizTemplateSchema = new Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', trim: true, maxlength: 300 },
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // ── Timer ─────────────────────────────────────────────────────────────────
    timer: {
        questionTime: { type: Number, default: 15, min: 5, max: 300 },   // per-question seconds
        autoNext:     { type: Boolean, default: true },                   // auto-advance on expiry
        interQuestionDelay: { type: Number, default: 3, min: 0, max: 30 }, // gap between questions
    },

    // ── Scoring ───────────────────────────────────────────────────────────────
    scoring: {
        basePoints:   { type: Number, default: 100, min: 0 },
        speedBonus:   { type: Boolean, default: true },    // extra pts for fast answers
        speedBonusMax:{ type: Number, default: 50, min: 0 }, // max bonus pts
        negativeMarking: {
            enabled:  { type: Boolean, default: false },
            penalty:  { type: Number, default: 25, min: 0 }, // points deducted on wrong ans
        },
    },

    // ── Leaderboard ───────────────────────────────────────────────────────────
    leaderboard: {
        enabled:               { type: Boolean, default: true },
        showLive:              { type: Boolean, default: true }, // host console live rank
        showAfterEachQuestion: { type: Boolean, default: true }, // participant sees rank after Q
        groupBy:               { type: String, enum: ['default', 'unit'], default: 'default' }, // Mastery Matrix
    },

    // ── Question Flow ─────────────────────────────────────────────────────────
    flow: {
        shuffleQuestions: { type: Boolean, default: false },
        shuffleOptions:   { type: Boolean, default: false },
        allowSkip:        { type: Boolean, default: false }, // future feature
    },

    // ── Access Control ────────────────────────────────────────────────────────
    access: {
        allowLateJoin:   { type: Boolean, default: true },
        maxParticipants: { type: Number, default: 200, min: 1 },
    },

    // ── Advanced (Creator / Teams plan only) ──────────────────────────────────
    advanced: {
        antiCheat:          { type: Boolean, default: false }, // detect suspicious patterns
        tabSwitchDetection: { type: Boolean, default: false }, // flag tab switch events
        requireCamera:      { type: Boolean, default: false }, // future: webcam proctoring
    },

    /** True for the auto-created default template per host */
    isDefault:  { type: Boolean, default: false },
    /** Plan gate: which plan is required to use this template */
    requiredPlan: { type: String, enum: ['FREE', 'CREATOR', 'TEAMS'], default: 'FREE' },

}, { timestamps: true });

QuizTemplateSchema.index({ hostId: 1, isDefault: 1 });
QuizTemplateSchema.index({ hostId: 1, createdAt: -1 });

module.exports = mongoose.model('QuizTemplate', QuizTemplateSchema);
