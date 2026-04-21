const hostService = require('../services/host/host.service');
const { HostProfile } = require('../models/HostProfile');
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/controllerHelpers');

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

const registerHost = async (req, res) => {
    try {
        const payload = req.body || {};
        
        // 1. Validation
        const validationError = hostService.validateHostPayload(payload);
        if (validationError) {
            return sendError(res, 400, validationError);
        }

        // 2. Execution (Atomic Transaction)
        const { user, profile, accessToken, refreshToken } = await hostService.registerHost(payload);

        // 3. Response handling
        res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

        return sendSuccess(res, {
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
        }, 'Host registered successfully', 201);

    } catch (error) {
        if (error.message === 'USER_EXISTS') {
            return sendError(res, 400, 'User already exists');
        }
        logger.error('[HostController] registerHost', { error: error.message, stack: error.stack });
        return sendError(res, 500, 'Server Error');
    }
};

const getMyHostProfile = async (req, res) => {
    try {
        const profile = await hostService.getHostProfile(req.user._id);
        if (!profile) {
            return sendError(res, 404, 'Host profile not found');
        }
        return sendSuccess(res, profile);
    } catch (error) {
        logger.error('[HostController] getMyHostProfile', { error: error.message });
        return sendError(res, 500, 'Server Error');
    }
};

const upsertMyHostProfile = async (req, res) => {
    try {
        const profile = await hostService.updateHostProfile(req.user._id, req.body);
        return sendSuccess(res, profile, 'Profile updated successfully');
    } catch (error) {
        logger.error('[HostController] upsertMyHostProfile', { error: error.message });
        return sendError(res, 500, 'Server Error');
    }
};

const getAdminHostInsights = async (req, res) => {
    try {
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

        return sendSuccess(res, { totals, byRole, byAudience, byQuizType, byDomain, kycStats });
    } catch (error) {
        logger.error('[HostController] getAdminHostInsights', { error: error.message });
        return sendError(res, 500, 'Server Error');
    }
};

const getAdminHosts = async (req, res) => {
    try {
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

        return sendSuccess(res, {
            total: await HostProfile.countDocuments({}),
            hosts,
            limit,
            skip,
        });
    } catch (error) {
        logger.error('[HostController] getAdminHosts', { error: error.message });
        return sendError(res, 500, 'Server Error');
    }
};

module.exports = {
    registerHost,
    getMyHostProfile,
    upsertMyHostProfile,
    getAdminHostInsights,
    getAdminHosts,
};
