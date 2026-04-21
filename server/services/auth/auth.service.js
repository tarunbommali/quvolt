const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../../models/User');

const { generateAccessToken, generateRefreshToken } = require('../../utils/token');

const register = async ({ name, email, password, role }) => {
    const safeRole = role === 'host' ? 'host' : 'participant';
    const normalizedEmail = String(email || '').trim().toLowerCase();
    
    // Check if user already exists
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
        throw new Error('USER_EXISTS');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: safeRole
    });

    // Auto-create default quiz template for hosts (fire-and-forget)
    if (safeRole === 'host') {
        const { createDefaultTemplate } = require('../quiz/template.service');
        createDefaultTemplate(user._id).catch((err) => {
            const logger = require('../../utils/logger');
            logger.warn('[Auth] Default template creation failed', { userId: user._id, error: err.message });
        });
    }

    const accessToken = generateAccessToken(user._id, user.role, user.subscription?.plan);
    const refreshToken = generateRefreshToken(user._id);

    await user.setRefreshToken(refreshToken);
    await user.save();

    return { user, accessToken, refreshToken };
};

const login = async ({ email, password }) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new Error('INVALID_CREDENTIALS');
    }

    const accessToken = generateAccessToken(user._id, user.role, user.subscription?.plan);
    const refreshToken = generateRefreshToken(user._id);

    await user.setRefreshToken(refreshToken);
    await user.save();

    return { user, accessToken, refreshToken };
};

const refreshSession = async (refreshToken) => {
    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || !(await user.matchesRefreshToken(refreshToken))) {
            throw new Error('INVALID_REFRESH_TOKEN');
        }

        const newAccessToken = generateAccessToken(user._id, user.role, user.subscription?.plan);
        const newRefreshToken = generateRefreshToken(user._id);

        await user.setRefreshToken(newRefreshToken);
        await user.save();

        return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (err) {
        throw new Error('INVALID_REFRESH_TOKEN');
    }
};

const logout = async (refreshToken) => {
    if (!refreshToken) return;
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
};

module.exports = {
    register,
    login,
    refreshSession,
    logout,
    generateAccessToken,
    generateRefreshToken,
};
