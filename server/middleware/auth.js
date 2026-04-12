const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Lightweight guard — reads id & role from JWT claims only.
 * Zero DB round-trip. Use this for the vast majority of routes.
 */
const protect = (req, res, next) => {
    try {
        if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, data: null, message: 'Not authorized, no token' });
        }

        const token = req.headers.authorization.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, data: null, message: 'Not authorized, malformed token' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Attach minimal user shape — sufficient for all CRUD + socket routes
        req.user = { _id: decoded.id, id: decoded.id, role: decoded.role };
        next();
    } catch (error) {
        const message = error.name === 'TokenExpiredError'
            ? 'Not authorized, token expired'
            : 'Not authorized, token failed';
        return res.status(401).json({ success: false, data: null, message });
    }
};

/**
 * Full-user guard — fetches the complete user document from MongoDB.
 * Use only for routes that need fields beyond id/role
 * (e.g. name, email, profilePhoto — i.e. GET /auth/me).
 */
const protectFull = async (req, res, next) => {
    try {
        if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, data: null, message: 'Not authorized, no token' });
        }

        const token = req.headers.authorization.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, data: null, message: 'Not authorized, malformed token' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password').lean();

        if (!user) {
            return res.status(401).json({ success: false, data: null, message: 'Not authorized, user not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        const message = error.name === 'TokenExpiredError'
            ? 'Not authorized, token expired'
            : 'Not authorized, token failed';
        return res.status(401).json({ success: false, data: null, message });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, data: null, message: 'Not authorized' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, data: null, message: `Role '${req.user.role}' is not authorized to access this resource` });
        }
        next();
    };
};

const requireQuizOwnership = async (req, res, next) => {
    try {
        const Quiz = require('../models/Quiz');
        const quizId = req.params.id || req.params.quizId;
        if (!quizId) {
            return res.status(400).json({ success: false, data: null, message: 'Quiz id is required' });
        }

        const quiz = await Quiz.findById(quizId).select('organizerId').lean();
        if (!quiz) {
            return res.status(404).json({ success: false, data: null, message: 'Quiz not found' });
        }

        if (req.user?.role !== 'admin' && String(quiz.organizerId) !== String(req.user?._id)) {
            return res.status(403).json({ success: false, data: null, message: 'Forbidden' });
        }

        return next();
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: 'Internal server error' });
    }
};

module.exports = { protect, protectFull, authorize, requireQuizOwnership };
