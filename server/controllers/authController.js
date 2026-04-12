const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

const generateAccessToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });
};

const mapUserPayload = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    profilePhoto: user.profilePhoto || '',
    role: user.role,
    createdAt: user.createdAt || null,
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

        // Guard against missing fields even if route validator is bypassed
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }

        const safeRole = role === 'organizer' ? 'organizer' : 'participant';
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const userExists = await User.findOne({ email: normalizedEmail });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email: normalizedEmail, password: hashedPassword, role: safeRole });

        if (user) {
            const accessToken = generateAccessToken(user._id, user.role);
            const refreshToken = generateRefreshToken(user._id);

            await user.setRefreshToken(refreshToken);
            await user.save();

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.status(201).json({
                ...mapUserPayload(user),
                token: accessToken,
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        logger.error('[Auth] registerUser', { message: error.message, code: error.code, stack: error.stack });
        if (error.code === 11000) {
            return res.status(400).json({ message: 'User already exists' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });

        if (user && (await bcrypt.compare(password, user.password))) {
            const accessToken = generateAccessToken(user._id, user.role);
            const refreshToken = generateRefreshToken(user._id);

            await user.setRefreshToken(refreshToken);
            await user.save();

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.json({
                ...mapUserPayload(user),
                token: accessToken,
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        logger.error('[Auth] loginUser', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const refresh = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || !(await user.matchesRefreshToken(refreshToken))) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        const newAccessToken = generateAccessToken(user._id, user.role);
        const newRefreshToken = generateRefreshToken(user._id);

        await user.setRefreshToken(newRefreshToken);
        await user.save();

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ token: newAccessToken });
    } catch (err) {
        return res.status(401).json({ message: 'Expired refresh token' });
    }
};

const logoutUser = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);
            if (user && (await user.matchesRefreshToken(refreshToken))) {
                user.refreshToken = null;
                await user.save();
            }
        } catch {
            // Fallback for legacy plain-text stored tokens.
            const user = await User.findOne({ refreshToken });
            if (user) {
                user.refreshToken = null;
                await user.save();
            }
        }
    }
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
};

const getMyProfile = async (req, res) => {
    res.json(mapUserPayload(req.user));
};

const updateMyProfile = async (req, res) => {
    try {
        const { name, profilePhoto, participantProfile, hostProfile } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
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

        if ((user.role === 'organizer' || user.role === 'admin') && hostProfile && typeof hostProfile === 'object') {
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

        res.json(mapUserPayload(user));
    } catch (error) {
        logger.error('[Auth] updateMyProfile', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { registerUser, loginUser, refresh, logoutUser, getMyProfile, updateMyProfile };
