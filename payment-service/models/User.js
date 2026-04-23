const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    required: true,
    unique: true
  },
  role: {
    type: String,
    enum: ['participant', 'host', 'admin'],
    default: 'participant'
  },
  plan: {
    type: String,
    enum: ['FREE', 'PRO', 'PREMIUM'],
    default: 'FREE'
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
