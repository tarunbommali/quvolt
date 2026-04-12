const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: EMAIL_REGEX,
  },
  password: { type: String, required: true },
  profilePhoto: { type: String, default: '' },
  role: { type: String, enum: ['admin', 'organizer', 'participant'], default: 'participant' },
  participantProfile: {
    phone: { type: String, default: '', trim: true, maxlength: 30 },
    city: { type: String, default: '', trim: true, maxlength: 80 },
    bio: { type: String, default: '', trim: true, maxlength: 280 },
  },
  hostProfile: {
    institutionName: { type: String, default: '', trim: true, maxlength: 120 },
    institutionType: { type: String, default: '', trim: true, maxlength: 80 },
    institutionWebsite: { type: String, default: '', trim: true, maxlength: 200 },
    institutionAddress: { type: String, default: '', trim: true, maxlength: 200 },
    contactEmail: { type: String, default: '', trim: true, maxlength: 120 },
    contactPhone: { type: String, default: '', trim: true, maxlength: 30 },
  },
  refreshToken: { type: String, default: null },
}, { timestamps: true });

UserSchema.index({ role: 1 });

UserSchema.methods.setRefreshToken = async function setRefreshToken(token) {
  if (!token) {
    this.refreshToken = null;
    return;
  }

  this.refreshToken = await bcrypt.hash(token, 10);
};

UserSchema.methods.matchesRefreshToken = async function matchesRefreshToken(token) {
  if (!this.refreshToken || !token) return false;

  // Backward compatibility for existing plain-text refresh tokens.
  if (this.refreshToken === token) return true;

  return bcrypt.compare(token, this.refreshToken);
};

module.exports = mongoose.model('User', UserSchema);
