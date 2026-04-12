const mongoose = require('mongoose');

const HOST_DOMAINS = ['education', 'tech', 'aptitude', 'government_exams', 'coding', 'others'];
const HOST_ROLES = ['individual_creator', 'institution', 'company', 'trainer'];
const AUDIENCE_SIZES = ['lt_100', '100_1k', '1k_10k', '10k_plus'];
const QUIZ_TYPES = ['free', 'paid', 'both'];
const PRICE_RANGES = ['10_50', '50_100', '100_plus'];

const hostProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true,
    },
    phone: {
        type: String,
        required: true,
        trim: true,
    },
    orgName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
    },
    logoUrl: {
        type: String,
        default: '',
    },
    description: {
        type: String,
        default: '',
        maxlength: 500,
    },
    website: {
        type: String,
        default: '',
        trim: true,
    },
    domains: {
        type: [String],
        enum: HOST_DOMAINS,
        default: [],
    },
    hostRole: {
        type: String,
        enum: HOST_ROLES,
        required: true,
    },
    audienceSize: {
        type: String,
        enum: AUDIENCE_SIZES,
        required: true,
    },
    quizType: {
        type: String,
        enum: QUIZ_TYPES,
        required: true,
    },
    priceRange: {
        type: String,
        enum: PRICE_RANGES,
        default: '10_50',
    },
    panCard: {
        type: String,
        default: '',
        trim: true,
    },
    bankAccountNumber: {
        type: String,
        default: '',
        trim: true,
        select: false,
    },
    ifscCode: {
        type: String,
        default: '',
        trim: true,
    },
    accountHolderName: {
        type: String,
        default: '',
        trim: true,
    },
    razorpayAccountId: {
        type: String,
        default: '',
        trim: true,
    },
    plan: {
        type: String,
        default: 'FREE',
        enum: ['FREE', 'PRO', 'PREMIUM'],
    },
    agreements: {
        termsAccepted: { type: Boolean, default: false },
        commissionAccepted: { type: Boolean, default: false },
        payoutPolicyAccepted: { type: Boolean, default: false },
    },
}, { timestamps: true });

hostProfileSchema.index({ domains: 1 });
hostProfileSchema.index({ hostRole: 1 });

module.exports = {
    HostProfile: mongoose.model('HostProfile', hostProfileSchema),
    HOST_DOMAINS,
    HOST_ROLES,
    AUDIENCE_SIZES,
    QUIZ_TYPES,
    PRICE_RANGES,
};
