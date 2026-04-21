const jwt = require('jsonwebtoken');

const generateAccessToken = (id, role, plan = 'FREE') => {
    return jwt.sign({ id, role, plan }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
};
