const mongoose = require('mongoose');

const quizSnapshotSchema = new mongoose.Schema({
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, trim: true, default: '' },
  isPaid: { type: Boolean, default: false },
  price: { type: Number, default: 0 },
}, {
  collection: 'quizzes',
  strict: false,
  versionKey: false,
});

module.exports = mongoose.model('QuizSnapshot', quizSnapshotSchema);
