const mongoose = require('mongoose');

const PlanConfigSchema = new mongoose.Schema({
  planId: { type: String, enum: ['FREE', 'CREATOR', 'TEAMS'], required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true }, // in INR
  participants: { type: Number, required: true },
  maxParticipantsPerSession: { type: Number, required: true },
  maxConcurrentSessions: { type: Number, required: true },
  maxQuizzes: { type: Number, required: true },

  features: [{ type: String }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('PlanConfig', PlanConfigSchema);
