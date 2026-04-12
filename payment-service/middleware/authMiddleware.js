const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    try {
        if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Not authorized, no token' });
        }

        const token = req.headers.authorization.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Not authorized, malformed token' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach decoded user to request (no DB lookup — trust JWT payload for perf)
        req.user = { _id: decoded.id, role: decoded.role };
        next();
    } catch (error) {
        const message = error.name === 'TokenExpiredError'
            ? 'Not authorized, token expired'
            : 'Not authorized, token failed';
        return res.status(401).json({ message });
    }
};

const authorize = (...allowedRoles) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized for this action' });
    }

    return next();
};

module.exports = { protect, authorize };
