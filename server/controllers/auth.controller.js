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
    profile: user.profile || {
        displayName: user.name,
        role: 'tutor',
        experienceLevel: 'intermediate',
        subjects: [],
        audience: [],
        bio: '',
        language: 'English',
        social: { youtube: '', linkedin: '' }
    },
    creator: user.creator || null,
    organization: user.organization || null,
    team: user.team || null,
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

const guestLogin = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return sendError(res, 400, 'Name must be at least 2 characters');
        }

        const { user, accessToken, refreshToken } = await authService.guestLogin({ name });

        res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

        return sendSuccess(res, {
            ...mapUserPayload(user),
            token: accessToken,
        }, 'Guest login successful');

    } catch (error) {
        logger.error('[AuthController] guestLogin', { message: error.message, stack: error.stack });
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

        if (user.role === 'host' || user.role === 'admin') {
            const { profile, creator, organization } = req.body;
            
            if (profile && typeof profile === 'object') {
                const currentProfile = user.profile?.toObject ? user.profile.toObject() : (user.profile || {});
                user.profile = {
                    ...currentProfile,
                    ...profile,
                    social: {
                        ...(currentProfile.social || {}),
                        ...(profile.social || {})
                    }
                };
            }

            const plan = user.subscription?.plan || 'FREE';
            
            if (plan === 'CREATOR' && creator && typeof creator === 'object') {
                const currentCreator = user.creator?.toObject ? user.creator.toObject() : (user.creator || {});
                user.creator = {
                    ...currentCreator,
                    ...creator,
                    pricing: {
                        ...(currentCreator.pricing || {}),
                        ...(creator.pricing || {})
                    },
                    payout: {
                        ...(currentCreator.payout || {}),
                        ...(creator.payout || {})
                    },
                    branding: {
                        ...(currentCreator.branding || {}),
                        ...(creator.branding || {})
                    }
                };
            }

            if (plan === 'TEAMS' && organization && typeof organization === 'object') {
                const currentOrg = user.organization?.toObject ? user.organization.toObject() : (user.organization || {});
                user.organization = {
                    ...currentOrg,
                    ...organization,
                    academic: {
                        ...(currentOrg.academic || {}),
                        ...(organization.academic || {})
                    },
                    contact: {
                        ...(currentOrg.contact || {}),
                        ...(organization.contact || {})
                    },
                    location: {
                        ...(currentOrg.location || {}),
                        ...(organization.location || {})
                    },
                    branding: {
                        ...(currentOrg.branding || {}),
                        ...(organization.branding || {})
                    }
                };
            }
        }

        await user.save();
        return sendSuccess(res, mapUserPayload(user), 'Profile updated successfully');
    } catch (error) {
        logger.error('[AuthController] updateMyProfile', { message: error.message, stack: error.stack });
        if (error.name === 'ValidationError') {
            return sendError(res, 400, Object.values(error.errors).map(val => val.message).join(', '));
        }
        return sendError(res, 500, 'Server Error');
    }
};

module.exports = {
    registerUser,
    loginUser,
    guestLogin,
    refresh,
    logoutUser,
    getMyProfile,
    updateMyProfile,
};
