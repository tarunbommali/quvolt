const mongoose = require('mongoose');

const QuizSessionSchema = new mongoose.Schema({
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', immutable: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, immutable: true },
    templateSnapshot: {
        type: {
            title: { type: String, default: '' },
            mode: { type: String, enum: ['auto', 'tutor'], default: 'auto' },
            accessType: { type: String, enum: ['public', 'private', 'shared'], default: 'public' },
            shuffleQuestions: { type: Boolean, default: false },
            questions: [
                {
                    _id: { type: mongoose.Schema.Types.Mixed },
                    text: { type: String, default: '' },
                    options: [{ type: String }],
                    correctOption: { type: Number, default: 0 },
                    hashedCorrectAnswer: { type: String, default: '' },
                    timeLimit: { type: Number, default: 15 },
                    shuffleOptions: { type: Boolean, default: false },
                    questionType: { type: String, default: 'multiple-choice' },
                    mediaUrl: { type: String, default: null },
                },
            ],
        },
        immutable: true,
        default: null,
    },
    sessionCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    status: { type: String, enum: ['draft', 'scheduled', 'waiting', 'live', 'completed', 'aborted'], default: 'draft' },
    mode: { type: String, enum: ['auto', 'tutor'], default: 'auto' },
    // Session-specific access control (Requirements 10.3, 10.4, 10.5)
    accessType: { type: String, enum: ['inherit', 'public', 'private', 'shared'], default: 'inherit' },
    allowedEmails: [{ type: String, trim: true, lowercase: true }],
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    questionState: { type: String, enum: ['waiting', 'live', 'review', 'paused'], default: 'waiting' },
    isPaused: { type: Boolean, default: false },
    currentQuestionIndex: { type: Number, default: 0 },
    questionStartTime: { type: Date, default: null },
    questionExpiry: { type: Date, default: null },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
    participantCount: { type: Number, default: 0 },
    peakParticipants: { type: Number, default: 0 }, // For SaaS billing
    totalSubmissions: { type: Number, default: 0 }, // For usage quotas
    sessionDuration: { type: Number, default: 0 }, // In seconds
    topWinners: [
        {
            name: { type: String },
            score: { type: Number },
            time: { type: Number },
            rank: { type: Number },
        }
    ],
    snapshot: {
        lastLeaderboard: { type: Array, default: [] },
        participants: { type: Array, default: [] },
        takenAt: { type: Date, default: null },
    },
}, { timestamps: true });

QuizSessionSchema.index({ quizId: 1, createdAt: -1 });
QuizSessionSchema.index({ templateId: 1, createdAt: -1 });
QuizSessionSchema.index({ quizId: 1, status: 1 });   // rebootQuizzes, getQuizSessions
QuizSessionSchema.index({ templateId: 1, status: 1 });
QuizSessionSchema.index({ status: 1, createdAt: -1 }); // admin dashboards
// sessionCode unique index is created by the field definition above

QuizSessionSchema.pre('validate', function() {
    if (!this.templateId && this.quizId) {
        this.templateId = this.quizId;
    }
});

module.exports = mongoose.model('QuizSession', QuizSessionSchema);
