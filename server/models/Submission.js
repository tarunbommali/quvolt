const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuizSession', default: null },
    roomCode: { type: String, required: true, uppercase: true, trim: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    selectedOption: { type: String, required: true, trim: true, maxlength: 500 },
    timeTaken: { type: Number, required: true, min: 0 },
    score: { type: Number, default: 0, min: 0 },
    isCorrect: { type: Boolean },
}, { timestamps: true });

SubmissionSchema.index({ quizId: 1, userId: 1 });
SubmissionSchema.index({ roomCode: 1, createdAt: -1 });
SubmissionSchema.index({ userId: 1, createdAt: -1 });
SubmissionSchema.index({ quizId: 1, roomCode: 1 });
SubmissionSchema.index({ sessionId: 1, userId: 1 });

module.exports = mongoose.model('Submission', SubmissionSchema);
