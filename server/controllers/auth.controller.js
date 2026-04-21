const User = require('../models/User');
const authService = require('../services/auth/auth.service');
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/controllerHelpers');

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

const mapUserPayload = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    profilePhoto: user.profilePhoto || '',
    role: user.role,
    createdAt: user.createdAt || null,
    subscription: {
        plan: user?.subscription?.plan || 'FREE',
        status: user?.subscription?.status || 'active',
        expiryDate: user?.subscription?.expiryDate || null,
    },
    usage: {
        activeSessions: user?.usage?.activeSessions || 0,
        quizzesCreated: user?.usage?.quizzesCreated || 0,
    },
    participantProfile: {
        phone: user?.participantProfile?.phone || '',
        city: user?.participantProfile?.city || '',
        bio: user?.participantProfile?.bio || '',
    },
    hostProfile: {
        institutionName: user?.hostProfile?.institutionName || '',
        institutionType: user?.hostProfile?.institutionType || '',
        institutionWebsite: user?.hostProfile?.institutionWebsite || '',
        institutionAddress: user?.hostProfile?.institutionAddress || '',
        contactEmail: user?.hostProfile?.contactEmail || '',
        contactPhone: user?.hostProfile?.contactPhone || '',
    },
});

const registerUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return sendError(res, 400, 'Name, email, and password are required');
        }

        const { user, accessToken, refreshToken } = await authService.register({ name, email, password, role });

        res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

        return sendSuccess(res, {
            ...mapUserPayload(user),
            token: accessToken,
        }, 'User registered successfully', 201);

    } catch (error) {
        if (error.message === 'USER_EXISTS') {
            return sendError(res, 400, 'User already exists');
        }
        logger.error('[AuthController] registerUser', { message: error.message, stack: error.stack });
        return sendError(res, 500, 'Server Error');
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return sendError(res, 400, 'Email and password are required');
        }

        const { user, accessToken, refreshToken } = await authService.login({ email, password });

        res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

        return sendSuccess(res, {
            ...mapUserPayload(user),
            token: accessToken,
        }, 'Login successful');

    } catch (error) {
        if (error.message === 'INVALID_CREDENTIALS') {
            return sendError(res, 401, 'Invalid email or password');
        }
        logger.error('[AuthController] loginUser', { message: error.message, stack: error.stack });
        return sendError(res, 500, 'Server Error');
    }
};

const refresh = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) return sendError(res, 401, 'No refresh token');

        const { accessToken, refreshToken: newRefreshToken } = await authService.refreshSession(refreshToken);

        res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);

        return sendSuccess(res, { token: accessToken }, 'Token refreshed');

    } catch (error) {
        return sendError(res, 401, 'Invalid or expired refresh token');
    }
};

const logoutUser = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        await authService.logout(refreshToken);
        
        res.clearCookie('refreshToken');
        return sendSuccess(res, null, 'Logged out successfully');
    } catch (error) {
        logger.error('[AuthController] logoutUser', { message: error.message });
        res.clearCookie('refreshToken');
        return sendSuccess(res, null, 'Logged out successfully');
    }
};

const getMyProfile = async (req, res) => {
    try {
        const User = require('../models/User');
        const Subscription = require('../models/Subscription');

        // Check authoritative subscriptions collection for the latest active plan
        const latestSub = await Subscription.findOne({
            hostId: req.user._id,
            status: 'active'
        }).lean();

        if (latestSub && req.user.subscription?.plan !== latestSub.plan) {
            await User.updateOne({ _id: req.user._id }, {
                'subscription.plan': latestSub.plan,
                'subscription.status': latestSub.status,
                'subscription.expiryDate': latestSub.expiryDate
            });
            // Update local object for response
            req.user.subscription = {
                plan: latestSub.plan,
                status: latestSub.status,
                expiryDate: latestSub.expiryDate
            };
        }
    } catch (err) {
        logger.warn('Failed to sync subscription during profile fetch', { error: err.message });
    }
    return sendSuccess(res, mapUserPayload(req.user));
};

const updateMyProfile = async (req, res) => {
    try {
        const { name, profilePhoto, participantProfile, hostProfile } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return sendError(res, 404, 'User not found');
        }

        if (typeof name === 'string' && name.trim()) {
            user.name = name.trim();
        }

        if (typeof profilePhoto === 'string') {
            user.profilePhoto = profilePhoto.trim();
        }

        if (user.role === 'participant' && participantProfile && typeof participantProfile === 'object') {
            user.participantProfile = {
                ...(user.participantProfile || {}),
                ...(typeof participantProfile.phone === 'string' ? { phone: participantProfile.phone.trim() } : {}),
                ...(typeof participantProfile.city === 'string' ? { city: participantProfile.city.trim() } : {}),
                ...(typeof participantProfile.bio === 'string' ? { bio: participantProfile.bio.trim() } : {}),
            };
        }

        if ((user.role === 'host' || user.role === 'admin') && hostProfile && typeof hostProfile === 'object') {
            user.hostProfile = {
                ...(user.hostProfile || {}),
                ...(typeof hostProfile.institutionName === 'string' ? { institutionName: hostProfile.institutionName.trim() } : {}),
                ...(typeof hostProfile.institutionType === 'string' ? { institutionType: hostProfile.institutionType.trim() } : {}),
                ...(typeof hostProfile.institutionWebsite === 'string' ? { institutionWebsite: hostProfile.institutionWebsite.trim() } : {}),
                ...(typeof hostProfile.institutionAddress === 'string' ? { institutionAddress: hostProfile.institutionAddress.trim() } : {}),
                ...(typeof hostProfile.contactEmail === 'string' ? { contactEmail: hostProfile.contactEmail.trim() } : {}),
                ...(typeof hostProfile.contactPhone === 'string' ? { contactPhone: hostProfile.contactPhone.trim() } : {}),
            };
        }

        await user.save();
        return sendSuccess(res, mapUserPayload(user), 'Profile updated successfully');
    } catch (error) {
        logger.error('[AuthController] updateMyProfile', { message: error.message, stack: error.stack });
        return sendError(res, 500, 'Server Error');
    }
};

module.exports = {
    registerUser,
    loginUser,
    refresh,
    logoutUser,
    getMyProfile,
    updateMyProfile,
};
