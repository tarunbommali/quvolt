const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const { HostProfile, HOST_DOMAINS, HOST_ROLES, AUDIENCE_SIZES, QUIZ_TYPES, PRICE_RANGES } = require('../../models/HostProfile');
const { generateAccessToken, generateRefreshToken } = require('../../utils/token');

const normalizeArray = (values = []) => (Array.isArray(values) ? values : []).map((v) => String(v || '').trim().toLowerCase());

const validateHostPayload = (payload) => {
    const domains = normalizeArray(payload.domains);
    const hasInvalidDomain = domains.some((domain) => !HOST_DOMAINS.includes(domain));

    if (!payload.name || !payload.email || !payload.password || !payload.phone) {
        return 'Name, email, phone, and password are required';
    }

    if (!payload.orgName) {
        return 'Organization name is required';
    }

    if (!domains.length || hasInvalidDomain) {
        return 'Select at least one valid domain';
    }

    if (!HOST_ROLES.includes(payload.hostRole)) {
        return 'Invalid host role';
    }

    if (!AUDIENCE_SIZES.includes(payload.audienceSize)) {
        return 'Invalid audience size';
    }

    if (!QUIZ_TYPES.includes(payload.quizType)) {
        return 'Invalid quiz type';
    }

    if (payload.priceRange && !PRICE_RANGES.includes(payload.priceRange)) {
        return 'Invalid price range';
    }

    const agreements = payload.agreements || {};
    if (!agreements.termsAccepted || !agreements.commissionAccepted || !agreements.payoutPolicyAccepted) {
        return 'All required agreements must be accepted';
    }

    return null;
};

const registerHost = async (payload) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const normalizedEmail = String(payload.email || '').trim().toLowerCase();
        
        // Check if user already exists
        const existing = await User.findOne({ email: normalizedEmail }).session(session);
        if (existing) {
            throw new Error('USER_EXISTS');
        }

        const hashedPassword = await bcrypt.hash(String(payload.password), 10);
        
        // 1. Create User
        const [user] = await User.create([{
            name: String(payload.name).trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: 'host',
            subscription: {
                plan: 'FREE',
                status: 'active'
            }
        }], { session });

        // 2. Create Host Profile
        const [profile] = await HostProfile.create([{
            userId: user._id,
            phone: String(payload.phone || '').trim(),
            orgName: String(payload.orgName || '').trim(),
            logoUrl: String(payload.logoUrl || '').trim(),
            description: String(payload.description || '').trim(),
            website: String(payload.website || '').trim(),
            domains: normalizeArray(payload.domains),
            hostRole: payload.hostRole,
            audienceSize: payload.audienceSize,
            quizType: payload.quizType,
            priceRange: payload.priceRange || '10_50',
            panCard: String(payload.panCard || '').trim().toUpperCase(),
            bankAccountNumber: String(payload.bankAccountNumber || '').trim(), // Note: Should be encrypted in prod
            ifscCode: String(payload.ifscCode || '').trim().toUpperCase(),
            accountHolderName: String(payload.accountHolderName || '').trim(),
            agreements: {
                termsAccepted: !!payload.agreements?.termsAccepted,
                commissionAccepted: !!payload.agreements?.commissionAccepted,
                payoutPolicyAccepted: !!payload.agreements?.payoutPolicyAccepted,
            },
        }], { session });

        // 3. Generate Tokens
        const accessToken = generateAccessToken(user._id, user.role);
        const refreshToken = generateRefreshToken(user._id);
        
        user.refreshToken = refreshToken; // User model handles hashing if configured
        await user.save({ session });

        await session.commitTransaction();
        return { user, profile, accessToken, refreshToken };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

const getHostProfile = async (userId) => {
    return await HostProfile.findOne({ userId }).select('+bankAccountNumber').lean();
};

const updateHostProfile = async (userId, payload) => {
    const update = {
        phone: payload.phone,
        orgName: payload.orgName,
        logoUrl: payload.logoUrl,
        description: payload.description,
        website: payload.website,
        domains: normalizeArray(payload.domains),
        hostRole: payload.hostRole,
        audienceSize: payload.audienceSize,
        quizType: payload.quizType,
        priceRange: payload.priceRange,
        panCard: payload.panCard ? String(payload.panCard).trim().toUpperCase() : undefined,
        bankAccountNumber: payload.bankAccountNumber ? String(payload.bankAccountNumber).trim() : undefined,
        ifscCode: payload.ifscCode ? String(payload.ifscCode).trim().toUpperCase() : undefined,
        accountHolderName: payload.accountHolderName,
        agreements: payload.agreements ? {
            termsAccepted: !!payload.agreements.termsAccepted,
            commissionAccepted: !!payload.agreements.commissionAccepted,
            payoutPolicyAccepted: !!payload.agreements.payoutPolicyAccepted,
        } : undefined,
    };

    // Remove undefined fields
    Object.keys(update).forEach(key => update[key] === undefined && delete update[key]);

    return await HostProfile.findOneAndUpdate(
        { userId },
        { $set: update },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
};

module.exports = {
    validateHostPayload,
    registerHost,
    getHostProfile,
    updateHostProfile,
};
