const mongoose = require('mongoose');

const hostAccountSchema = new mongoose.Schema({
  hostUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Host user ID is required'],
    unique: true,
    index: true,
  },
  linkedAccountId: {
    type: String,
    required: [true, 'Linked account ID is required'],
    trim: true,
    unique: true,
  },
  accountStatus: {
    type: String,
    enum: ['not_started', 'pending', 'verified', 'suspended', 'rejected'],
    default: 'not_started',
    index: true,
  },
  payoutEnabled: {
    type: Boolean,
    default: false,
  },
  settlementMode: {
    type: String,
    enum: ['instant', 'scheduled'],
    default: 'scheduled',
  },
  bankLast4: {
    type: String,
    trim: true,
    default: '',
  },
  ifsc: {
    type: String,
    trim: true,
    default: '',
  },
  notes: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, { timestamps: true });

module.exports = mongoose.model('HostAccount', hostAccountSchema);
