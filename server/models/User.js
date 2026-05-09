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
  role: { type: String, enum: ['admin', 'host', 'participant'], default: 'participant' },
  // RBAC: Support multiple roles per user (Requirement 7.5)
  roles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
  }],
  participantProfile: {
    phone: { type: String, default: '', trim: true, maxlength: 30 },
    city: { type: String, default: '', trim: true, maxlength: 80 },
    bio: { type: String, default: '', trim: true, maxlength: 280 },
  },
  // Unified Base Host Profile (applies to ALL plans)
  profile: {
    displayName: { type: String, trim: true, maxlength: 80 },
    role: { type: String, enum: ['tutor', 'teacher', 'creator', 'student', 'other'], default: 'tutor' },
    experienceLevel: { type: String, enum: ['beginner', 'intermediate', 'expert'], default: 'intermediate' },
    subjects: [{ type: String, trim: true }],
    audience: [{ type: String, trim: true }],
    bio: { type: String, trim: true, maxlength: 500 },
    language: { type: String, default: 'English' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    emailPreferences: { type: Boolean, default: true },
    social: {
      youtube: { type: String, trim: true },
      linkedin: { type: String, trim: true }
    }
  },

  // Plan Extension: CREATOR
  creator: {
    brandName: { type: String, trim: true },
    tagline: { type: String, trim: true },
    website: { type: String, trim: true },
    pricing: {
      defaultQuizPrice: { type: Number, default: 0 },
      currency: { type: String, default: 'INR' }
    },
    payout: {
      upiId: { type: String, trim: true },
      bankAccount: { type: String, trim: true }
    },
    branding: {
      logoUrl: { type: String, trim: true },
      description: { type: String, trim: true }
    },
    certifications: { type: String, trim: true },
    hiringDomain: { type: String, trim: true },
    verified: { type: Boolean, default: false }
  },

  // Plan Extension: TEAMS (Organization)
  organization: {
    name: { type: String, trim: true },
    type: { type: String, enum: ['university', 'institute', 'company', 'other'], default: 'company' },
    domain: { type: String, trim: true },
    website: { type: String, trim: true },
    industry: { type: String, trim: true },
    academic: {
      department: { type: String, trim: true },
      affiliation: { type: String, trim: true }
    },
    contact: {
      phone: { type: String, trim: true },
      email: { type: String, trim: true }
    },
    location: {
      country: { type: String, trim: true },
      state: { type: String, trim: true }
    },
    branding: {
      logoUrl: { type: String, trim: true },
      description: { type: String, trim: true }
    },
    taxId: { type: String, trim: true },
    departments: { type: String, trim: true },
    verified: { type: Boolean, default: false }
  },

  // Team controls for TEAMS plan
  team: {
    members: { type: Number, default: 1 },
    rolesEnabled: { type: Boolean, default: true }
  },
  refreshToken: { type: String, default: null },
  subscription: {
    plan: { type: String, enum: ['FREE', 'CREATOR', 'TEAMS'], default: 'FREE' },
    status: { type: String, enum: ['active', 'inactive', 'expired'], default: 'active' },
    expiryDate: { type: Date, default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
  },
  usage: {
    activeSessions: { type: Number, default: 0 },
    quizzesCreated: { type: Number, default: 0 },
  },
  // Razorpay Sub-Merchant / Marketplace Routing
  razorpayAccountId: { type: String, default: null },
  kycStatus: { 
    type: String, 
    enum: ['not_started', 'pending', 'verified', 'rejected'], 
    default: 'not_started' 
  },
  payoutEnabled: { type: Boolean, default: false },
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
