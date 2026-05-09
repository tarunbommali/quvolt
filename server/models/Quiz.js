const mongoose = require('mongoose');
const { QUIZ_TYPE_OPTIONS } = require('../utils/constants');

const QuestionSchema = new mongoose.Schema({
    text: { type: String, required: true, trim: true, minlength: 1, maxlength: 500 },
    options: {
        type: [{ type: String, required: true, trim: true, maxlength: 250 }],
        validate: {
            validator: (value) => Array.isArray(value) && value.length >= 2,
            message: 'Question must have at least 2 options',
        },
    },
    correctOption: { type: Number, default: 0, min: 0 },
    hashedCorrectAnswer: { type: String, required: true },
    timeLimit: { type: Number, default: 30, min: 5, max: 300 },
    mediaUrl: { type: String, default: null, trim: true },
    questionType: { type: String, enum: ['multiple-choice', 'true-false'], default: 'multiple-choice' },
    shuffleOptions: { type: Boolean, default: false },
    explanation: { type: String, default: '', trim: true, maxlength: 1000 },
    // [I18N] Translation storage
    translations: {
        type: Map,
        of: new mongoose.Schema({
            text: { type: String, required: true },
            options: { type: [{ type: String, required: true }] },
            explanation: { type: String, default: '' }
        }, { _id: false }),
        default: {}
    }
}, { _id: true });

QuestionSchema.path('correctOption').validate(function validateCorrectOption(index) {
    if (!Array.isArray(this.options) || this.options.length === 0) return false;
    return Number.isInteger(index) && index >= 0 && index < this.options.length;
}, 'correctOption must point to a valid option index');

const QuizSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 150 },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    roomCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    type: { type: String, enum: ['quiz', 'subject', 'template'], default: 'quiz' },
    quizCategory: {
        type: String,
        enum: QUIZ_TYPE_OPTIONS,
        default: 'regular',
    },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', default: null },
    status: { type: String, enum: ['draft', 'scheduled', 'waiting', 'live', 'completed', 'aborted'], default: 'draft' },
    // Resource-level access control (Requirements 8.3, 8.4, 8.5)
    accessType: { type: String, enum: ['public', 'private', 'shared'], default: 'public' },
    allowedEmails: [{ type: String, trim: true, lowercase: true }],
    // Shared access control - users who have been granted specific access
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    shuffleQuestions: { type: Boolean, default: false },
    interQuestionDelay: { type: Number, default: 5, min: 0, max: 30 }, // seconds between questions
    mode: { type: String, enum: ['auto', 'teaching', 'tutor'], default: 'auto' },
    
    // [I18N] Language Settings
    defaultLanguage: { type: String, default: 'en' },
    availableLanguages: { type: [{ type: String }], default: ['en'] },
    requireLanguageSelection: { type: Boolean, default: true },
    
    questions: {
        type: [QuestionSchema],
        validate: [
            (val) => val.length <= 300,
            "Too many questions. Maximum allowed is 300."
        ]
    },
    // Scheduling
    scheduledAt: { type: Date, default: null },
    lastSessionCode: { type: String, default: null, uppercase: true, trim: true },
    lastSessionStatus: { type: String, enum: ['live', 'completed', 'aborted', null], default: null },
    lastSessionEndedAt: { type: Date, default: null },
    lastSessionMessage: { type: String, default: '' },
    // Participants who registered / joined the scheduled session
    joinedParticipants: [
        {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            name: { type: String, required: true },
            joinedAt: { type: Date, default: Date.now },
        }
    ],

    // Hierarchical Navigation (NEW)
    level: { type: Number, default: 0 },         // 0 = root, 1 = child, ...
    label: { type: String, trim: true },         // optional semantic label (e.g., "Semester", "Unit")
    path:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' }], // hierarchy path [rootId, ..., selfId]

    leaderboard: {
        enabled:               { type: Boolean, default: true },
        showLive:              { type: Boolean, default: true },
        showAfterEachQuestion: { type: Boolean, default: true },
        groupBy:               { type: String, enum: ['default', 'unit'], default: 'default' },
    },
}, { timestamps: true });


QuizSchema.index({ hostId: 1, createdAt: -1 });
QuizSchema.index({ parentId: 1, createdAt: -1 });
QuizSchema.index({ status: 1, updatedAt: -1 });

QuizSchema.pre('validate', function normalizeQuiz() {
    if (this.type === 'subject') {
        this.quizCategory = null;
    }

    this.mode = this.mode === 'teaching' ? 'tutor' : this.mode;

    // Clear allowedEmails if not private
    if (this.accessType !== 'private') {
        this.allowedEmails = [];
    } else {
        this.allowedEmails = Array.from(new Set(
            (this.allowedEmails || [])
                .map((email) => String(email || '').trim().toLowerCase())
                .filter(Boolean),
        ));
    }
    
    // Clear sharedWith if not shared
    if (this.accessType !== 'shared') {
        this.sharedWith = [];
    }
});

QuizSchema.index({ createdAt: -1 });
QuizSchema.index({ hostId: 1, createdAt: -1 });
QuizSchema.index({ parentId: 1, createdAt: -1 });
QuizSchema.index({ path: 1 });
QuizSchema.index({ level: 1 });

module.exports = mongoose.model('Quiz', QuizSchema);
