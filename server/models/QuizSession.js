const mongoose = require('mongoose');

const QuizSessionSchema = new mongoose.Schema({
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    sessionCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    status: { type: String, enum: ['draft', 'scheduled', 'waiting', 'live', 'completed', 'aborted'], default: 'draft' },
    mode: { type: String, enum: ['auto', 'tutor'], default: 'auto' },
    questionState: { type: String, enum: ['waiting', 'live', 'review', 'paused'], default: 'waiting' },
    isPaused: { type: Boolean, default: false },
    currentQuestionIndex: { type: Number, default: 0 },
    questionStartTime: { type: Date, default: null },
    questionExpiry: { type: Date, default: null },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
    participantCount: { type: Number, default: 0 },
    topWinners: [
        {
            name: { type: String },
            score: { type: Number },
            time: { type: Number },
            rank: { type: Number },
        }
    ],
}, { timestamps: true });

QuizSessionSchema.index({ quizId: 1, createdAt: -1 });
QuizSessionSchema.index({ quizId: 1, status: 1 });   // rebootQuizzes, getQuizSessions
QuizSessionSchema.index({ status: 1, createdAt: -1 }); // admin dashboards
// sessionCode unique index is created by the field definition above

module.exports = mongoose.model('QuizSession', QuizSessionSchema);
