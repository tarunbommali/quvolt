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
        const rbacService = require('../services/rbac/rbac.service');
        
        const quizId = req.params.id || req.params.quizId || req.params.templateId;
        if (!quizId) {
            return res.status(400).json({ success: false, data: null, message: 'Quiz id is required' });
        }

        // Admin role check (legacy support)
        if (req.user?.role === 'admin') {
            return next();
        }

        const quiz = await Quiz.findById(quizId).select('hostId accessType sharedWith').lean();
        if (!quiz) {
            return res.status(404).json({ success: false, data: null, message: 'Quiz not found' });
        }

        // Check if user is the owner
        const isOwner = String(quiz.hostId) === String(req.user?._id);
        
        // If owner, allow immediately (optimization - skip RBAC check)
        if (isOwner) {
            return next();
        }
        
        // Check if user has admin permission via RBAC (Requirement 8.2)
        // This is a fallback for non-owners who might have admin permissions
        const hasAdminPermission = await rbacService.checkPermission(req.user._id, 'manage_quiz', quizId);
        
        // Allow if has admin permission
        if (hasAdminPermission) {
            return next();
        }

        return res.status(403).json({ success: false, data: null, message: 'Forbidden' });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: 'Internal server error' });
    }
};

/**
 * Middleware to check quiz access based on access policy
 * Requirements: 8.3, 8.4, 8.5
 * Supports public, private, and shared access policies
 */
const checkQuizAccess = async (req, res, next) => {
    try {
        const Quiz = require('../models/Quiz');
        const QuizSession = require('../models/QuizSession');
        const rbacService = require('../services/rbac/rbac.service');
        
        const quizId = req.params.id || req.params.quizId || req.params.templateId || req.params.roomCode;
        if (!quizId) {
            return res.status(400).json({ success: false, data: null, message: 'Quiz id is required' });
        }

        // Find quiz by ID, room code, or session code
        let quiz;
        if (quizId.length === 6 && /^[A-Z0-9]+$/.test(quizId)) {
            // Looks like a room code or session code
            // First try to find by room code
            quiz = await Quiz.findOne({ roomCode: quizId }).select('hostId accessType allowedEmails sharedWith').lean();
            
            // If not found, try to find by session code
            if (!quiz) {
                const session = await QuizSession.findOne({ sessionCode: quizId }).select('quizId').lean();
                if (session) {
                    quiz = await Quiz.findById(session.quizId).select('hostId accessType allowedEmails sharedWith').lean();
                }
            }
        } else {
            quiz = await Quiz.findById(quizId).select('hostId accessType allowedEmails sharedWith').lean();
        }

        if (!quiz) {
            return res.status(404).json({ success: false, data: null, message: 'Quiz not found' });
        }

        // Admin always has access
        if (req.user?.role === 'admin') {
            return next();
        }

        // Owner always has access
        const isOwner = String(quiz.hostId) === String(req.user?._id);
        if (isOwner) {
            return next();
        }

        // Requirement 8.5: Public quizzes allow any authenticated user to view
        if (quiz.accessType === 'public') {
            return next();
        }

        // Requirement 8.4: Private quizzes restrict access to owner and explicitly granted users
        if (quiz.accessType === 'private') {
            // Check if user's email is in allowedEmails
            const userEmail = req.user?.email?.toLowerCase();
            if (userEmail && quiz.allowedEmails && quiz.allowedEmails.includes(userEmail)) {
                return next();
            }

            // Check if user has admin permission via RBAC (only if not owner)
            const hasAdminPermission = await rbacService.checkPermission(req.user._id, 'manage_quiz', quizId);
            if (hasAdminPermission) {
                return next();
            }

            return res.status(403).json({ 
                success: false, 
                data: null, 
                message: 'This quiz is private. You do not have access.' 
            });
        }

        // Requirement 8.3: Shared quizzes allow access to explicitly granted users
        if (quiz.accessType === 'shared') {
            // Check if user is in sharedWith array
            const hasSharedAccess = quiz.sharedWith && quiz.sharedWith.some(
                userId => String(userId) === String(req.user?._id)
            );
            
            if (hasSharedAccess) {
                return next();
            }

            // Check if user has admin permission via RBAC
            const hasAdminPermission = await rbacService.checkPermission(req.user._id, 'manage_quiz', quizId);
            if (hasAdminPermission) {
                return next();
            }

            return res.status(403).json({ 
                success: false, 
                data: null, 
                message: 'This quiz is shared. You do not have access.' 
            });
        }

        // Default: allow access
        return next();
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: 'Internal server error' });
    }
};

module.exports = { protect, protectFull, authorize, requireQuizOwnership, checkQuizAccess };
