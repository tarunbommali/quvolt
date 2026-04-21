const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  code: { type: String, required: true, unique: true, uppercase: true },
  type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  value: { type: Number, required: true }, // 10 for 10% or 100 for ₹100
  applicablePlans: [{ type: String, enum: ['CREATOR', 'TEAMS'] }],
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  isActive: { type: Boolean, default: true },
  usageLimit: { type: Number, default: null }, // Total times it can be used
  usageCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Offer', OfferSchema);
