const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { HostProfile, HOST_DOMAINS, HOST_ROLES, AUDIENCE_SIZES, QUIZ_TYPES, PRICE_RANGES } = require('../models/HostProfile');

const generateAccessToken = (id, role) => jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '15m' });
const generateRefreshToken = (id) => jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });

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

const registerHost = async (req, res) => {
    try {
        const payload = req.body || {};
        const validationError = validateHostPayload(payload);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const normalizedEmail = String(payload.email || '').trim().toLowerCase();
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(String(payload.password), 10);
        const user = await User.create({
            name: String(payload.name).trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: 'host',
        });

        let profile;
        try {
            profile = await HostProfile.create({
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
                bankAccountNumber: String(payload.bankAccountNumber || '').trim(),
                ifscCode: String(payload.ifscCode || '').trim().toUpperCase(),
                accountHolderName: String(payload.accountHolderName || '').trim(),
                agreements: {
                    termsAccepted: !!payload.agreements?.termsAccepted,
                    commissionAccepted: !!payload.agreements?.commissionAccepted,
                    payoutPolicyAccepted: !!payload.agreements?.payoutPolicyAccepted,
                },
            });
        } catch (profileErr) {
            // Rollback: remove the user if profile creation fails to prevent orphaned accounts
            await User.deleteOne({ _id: user._id }).catch(() => { });
            throw profileErr;
        }

        const accessToken = generateAccessToken(user._id, user.role);
        const refreshToken = generateRefreshToken(user._id);
        await user.setRefreshToken(refreshToken);
        await user.save();

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profilePhoto: user.profilePhoto,
            role: user.role,
            token: accessToken,
            hostProfile: {
                orgName: profile.orgName,
                plan: profile.plan,
                domains: profile.domains,
                hostRole: profile.hostRole,
                audienceSize: profile.audienceSize,
                quizType: profile.quizType,
            },
        });
    } catch (error) {
        console.error('[Host Onboarding Error] Register:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'User already exists' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

const getMyHostProfile = async (req, res) => {
    const profile = await HostProfile.findOne({ userId: req.user._id }).select('+bankAccountNumber').lean();
    if (!profile) return res.status(404).json({ message: 'Host profile not found' });
    return res.json(profile);
};

const upsertMyHostProfile = async (req, res) => {
    const payload = req.body || {};
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
        panCard: payload.panCard ? String(payload.panCard).trim().toUpperCase() : '',
        bankAccountNumber: payload.bankAccountNumber ? String(payload.bankAccountNumber).trim() : '',
        ifscCode: payload.ifscCode ? String(payload.ifscCode).trim().toUpperCase() : '',
        accountHolderName: payload.accountHolderName,
        agreements: {
            termsAccepted: !!payload.agreements?.termsAccepted,
            commissionAccepted: !!payload.agreements?.commissionAccepted,
            payoutPolicyAccepted: !!payload.agreements?.payoutPolicyAccepted,
        },
    };

    Object.keys(update).forEach((key) => {
        if (update[key] === undefined) delete update[key];
    });

    const profile = await HostProfile.findOneAndUpdate(
        { userId: req.user._id },
        { $set: update },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json(profile);
};

const getAdminHostInsights = async (req, res) => {
    const [totals, byRole, byAudience, byQuizType, byDomain, kycStats] = await Promise.all([
        HostProfile.countDocuments({}),
        HostProfile.aggregate([{ $group: { _id: '$hostRole', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        HostProfile.aggregate([{ $group: { _id: '$audienceSize', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        HostProfile.aggregate([{ $group: { _id: '$quizType', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        HostProfile.aggregate([
            { $unwind: { path: '$domains', preserveNullAndEmptyArrays: true } },
            { $group: { _id: '$domains', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]),
        HostProfile.aggregate([
            {
                $project: {
                    hasKyc: {
                        $and: [
                            { $gt: [{ $strLenCP: { $ifNull: ['$panCard', ''] } }, 0] },
                            { $gt: [{ $strLenCP: { $ifNull: ['$bankAccountNumber', ''] } }, 0] },
                            { $gt: [{ $strLenCP: { $ifNull: ['$ifscCode', ''] } }, 0] },
                            { $gt: [{ $strLenCP: { $ifNull: ['$accountHolderName', ''] } }, 0] },
                        ],
                    },
                },
            },
            { $group: { _id: '$hasKyc', count: { $sum: 1 } } },
        ]),
    ]);

    return res.json({
        totals,
        byRole,
        byAudience,
        byQuizType,
        byDomain,
        kycStats,
    });
};

const getAdminHosts = async (req, res) => {
    const limit = Math.min(Number(req.query.limit || 100), 250);
    const skip = Math.max(Number(req.query.skip || 0), 0);

    const records = await HostProfile.aggregate([
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
            $addFields: {
                hasKyc: {
                    $and: [
                        { $gt: [{ $strLenCP: { $ifNull: ['$panCard', ''] } }, 0] },
                        { $gt: [{ $strLenCP: { $ifNull: ['$bankAccountNumber', ''] } }, 0] },
                        { $gt: [{ $strLenCP: { $ifNull: ['$ifscCode', ''] } }, 0] },
                        { $gt: [{ $strLenCP: { $ifNull: ['$accountHolderName', ''] } }, 0] },
                    ],
                },
            },
        },
        {
            $project: {
                userId: 1,
                orgName: 1,
                domains: 1,
                hostRole: 1,
                audienceSize: 1,
                quizType: 1,
                priceRange: 1,
                plan: 1,
                hasKyc: 1,
                createdAt: 1,
            },
        },
    ]);

    await HostProfile.populate(records, {
        path: 'userId',
        select: 'name email role createdAt',
    });

    const hosts = records.map((record) => ({
        _id: record._id,
        userId: record.userId?._id,
        name: record.userId?.name || '',
        email: record.userId?.email || '',
        orgName: record.orgName,
        domains: record.domains || [],
        hostRole: record.hostRole,
        audienceSize: record.audienceSize,
        quizType: record.quizType,
        priceRange: record.priceRange,
        plan: record.plan,
        hasKyc: Boolean(record.hasKyc),
        createdAt: record.createdAt,
    }));

    return res.json({
        total: await HostProfile.countDocuments({}),
        hosts,
        limit,
        skip,
    });
};

module.exports = {
    registerHost,
    getMyHostProfile,
    upsertMyHostProfile,
    getAdminHostInsights,
    getAdminHosts,
};
