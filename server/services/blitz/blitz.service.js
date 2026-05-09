const mongoose = require('mongoose');
const BlitzSession = require('../../models/BlitzSession');
const QuizResult   = require('../../models/QuizResult');
const Quiz         = require('../../models/Quiz');
const logger       = require('../../utils/logger');
const templateService = require('../quiz/template.service');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Validate and return a Quiz document (by _id with type constraint).
 * @param {string} id
 * @param {string} type - 'quiz' | 'subject'
 */
const _findQuizOrThrow = async (id, type) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw Object.assign(new Error(`Invalid id: ${id}`), { statusCode: 400 });
    }
    const doc = await Quiz.findOne({ _id: id, type }).lean();
    if (!doc) {
        throw Object.assign(new Error(`${type === 'subject' ? 'Folder' : 'Quiz'} not found`), { statusCode: 404 });
    }
    return doc;
};

/**
 * Resolve all quizzes within a folder (subject).
 * Folder → units (subjects with parentId = folderId) → quizzes (parentId = unitId).
 * Returns a flat map of { unitId → [quizIds] }.
 */
const _resolveFolderHierarchy = async (folderId) => {
    const units = await Quiz.find({ parentId: folderId, type: 'subject' }).lean();
    if (!units.length) {
        throw Object.assign(new Error('Folder has no units'), { statusCode: 400 });
    }

    const unitIds = units.map(u => u._id);
    const quizzes = await Quiz.find({ parentId: { $in: unitIds }, type: { $in: ['quiz', 'template'] } })
        .select('_id parentId')
        .lean();

    const unitMap = new Map(units.map(u => [String(u._id), []]));
    for (const q of quizzes) {
        const key = String(q.parentId);
        if (unitMap.has(key)) unitMap.get(key).push(q._id);
    }

    return unitMap; // Map<unitId_string, quizId[]>
};

// ── Access Guard ─────────────────────────────────────────────────────────────

/**
 * Check if a user has access to a blitz session.
 * For folder mode: user must be in session.participants OR in folder.allowedEmails / sharedWith.
 */
const _assertAccess = (session, userId) => {
    const uid = String(userId);
    const allowed = session.participants.some(p => String(p) === uid);
    if (!allowed) {
        throw Object.assign(new Error('Access denied: not a participant'), { statusCode: 403 });
    }
};

// ── Core Service Methods ──────────────────────────────────────────────────────

/**
 * Start a new blitz session.
 * @param {{ type: 'single'|'folder', quizId?: string, folderId?: string, hostId: string }} params
 */
const startBlitz = async ({ type, quizId, folderId, hostId }) => {
    if (type === 'single') {
        await _findQuizOrThrow(quizId, 'quiz');
        const template = await templateService.getDefaultTemplate(hostId);
        const session = await BlitzSession.create({
            hostId,
            type: 'single',
            quizId,
            status: 'waiting',
            participants: [hostId],
            templateConfig: template,
        });
        logger.info('[BlitzService] Single blitz started', { sessionId: session._id, quizId });
        return session;
    }

    if (type === 'folder') {
        await _findQuizOrThrow(folderId, 'subject');
        await _resolveFolderHierarchy(folderId); // validates structure
        const template = await templateService.getDefaultTemplate(hostId);
        const session = await BlitzSession.create({
            hostId,
            type: 'folder',
            folderId,
            status: 'waiting',
            participants: [hostId],
            templateConfig: template,
        });
        logger.info('[BlitzService] Folder blitz started', { sessionId: session._id, folderId });
        return session;
    }

    throw Object.assign(new Error('type must be "single" or "folder"'), { statusCode: 400 });
};

/**
 * Record a quiz result for a participant in a blitz session.
 * Idempotent: increments attempt counter if record already exists.
 *
 * @param {{ sessionId, userId, quizId, score, unitId?, folderId? }} params
 */
const recordResult = async ({ sessionId, userId, quizId, score, unitId = null, folderId = null }) => {
    // If IDs are missing, resolve them from the Quiz document's hierarchical path
    if (!unitId || !folderId) {
        const quiz = await Quiz.findById(quizId).select('parentId path').lean();
        if (quiz) {
            unitId = unitId || quiz.parentId;
            folderId = folderId || (quiz.path && quiz.path.length > 0 ? quiz.path[0] : null);
        }
    }

    const existing = await QuizResult.findOne({ sessionId, userId, quizId });

    if (existing) {
        existing.score   = Math.max(existing.score, score); // keep best score
        existing.attempt = (existing.attempt || 1) + 1;
        return existing.save();
    }

    return QuizResult.create({ sessionId, userId, quizId, score, unitId, folderId, attempt: 1 });
};

/**
 * Get the single-mode leaderboard for a blitz session.
 * Groups by userId, takes max score.
 *
 * @param {string} sessionId
 * @returns {Array<{ userId, score }>}
 */
const getSingleLeaderboard = async (sessionId) => {
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        throw Object.assign(new Error('Invalid sessionId'), { statusCode: 400 });
    }

    const results = await QuizResult.aggregate([
        { $match: { sessionId: new mongoose.Types.ObjectId(sessionId) } },
        {
            $group: {
                _id: '$userId',
                score: { $max: '$score' },
            },
        },
        { $sort: { score: -1 } },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                pipeline: [{ $project: { name: 1, profilePhoto: 1 } }],
                as: 'user',
            },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 0,
                userId: '$_id',
                name: '$user.name',
                profilePhoto: '$user.profilePhoto',
                score: 1,
            },
        },
    ]);

    return results;
};

/**
 * Get the folder-mode leaderboard for a blitz session.
 *
 * Pipeline:
 *  1. Match all results for the session.
 *  2. Group by (userId, unitId) → take max score per quiz → sum = unitScore.
 *  3. Group by userId → sum unitScores = totalScore; push unit breakdowns.
 *  4. Sort descending.
 *
 * @param {string} sessionId
 * @returns {Array<{ userId, name, totalScore, unitBreakdown: [{ unitId, score }] }>}
 */
const getFolderLeaderboard = async (sessionId) => {
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        throw Object.assign(new Error('Invalid sessionId'), { statusCode: 400 });
    }

    const results = await QuizResult.aggregate([
        { $match: { sessionId: new mongoose.Types.ObjectId(sessionId) } },

        // Step 1: Per-quiz best score per user (handles multiple attempts)
        {
            $group: {
                _id: { userId: '$userId', unitId: '$unitId', quizId: '$quizId' },
                quizScore: { $max: '$score' },
            },
        },

        // Step 2: Aggregate quiz scores into unit scores
        {
            $group: {
                _id: { userId: '$_id.userId', unitId: '$_id.unitId' },
                unitScore: { $sum: '$quizScore' },
            },
        },

        // Step 3: Aggregate unit scores into total folder score per user
        {
            $group: {
                _id: '$_id.userId',
                totalScore: { $sum: '$unitScore' },
                unitBreakdown: {
                    $push: {
                        unitId: '$_id.unitId',
                        score:  '$unitScore',
                    },
                },
            },
        },

        { $sort: { totalScore: -1 } },

        // Step 4: Enrich with user info
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                pipeline: [{ $project: { name: 1, email: 1, profilePhoto: 1 } }],
                as: 'user',
            },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },

        {
            $project: {
                _id: 0,
                userId: '$_id',
                name: '$user.name',
                email: '$user.email',
                profilePhoto: '$user.profilePhoto',
                totalScore: 1,
                unitBreakdown: 1,
            },
        },
    ]);

    return results;
};

/**
 * Get session with access check.
 */
const getSession = async (sessionId, userId) => {
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        throw Object.assign(new Error('Invalid sessionId'), { statusCode: 400 });
    }
    const session = await BlitzSession.findById(sessionId).lean();
    if (!session) {
        throw Object.assign(new Error('Blitz session not found'), { statusCode: 404 });
    }
    if (userId) _assertAccess(session, userId);
    return session;
};

/**
 * Join a blitz session (adds userId to participants if not already present).
 * Implements access control:
 * - user in folder.participants (joinedParticipants)
 * - user in quiz.privateList (allowedEmails or sharedWith)
 */
const joinSession = async (sessionId, userId) => {
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        throw Object.assign(new Error('Invalid sessionId'), { statusCode: 400 });
    }
    const session = await BlitzSession.findById(sessionId);
    if (!session) throw Object.assign(new Error('Blitz session not found'), { statusCode: 404 });
    if (session.status === 'ended') throw Object.assign(new Error('Session has ended'), { statusCode: 410 });

    const uid = String(userId);
    const alreadyJoined = session.participants.some(p => String(p) === uid);
    if (alreadyJoined) return session;

    // Access Control check
    const User = mongoose.model('User');
    const user = await User.findById(userId).lean();
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

    const resourceId = session.type === 'folder' ? session.folderId : session.quizId;
    const resource = await Quiz.findById(resourceId).lean();
    if (!resource) throw Object.assign(new Error('Target resource not found'), { statusCode: 404 });

    // 1. Host always has access
    if (String(resource.hostId) === uid) {
        session.participants.push(userId);
        await session.save();
        return session;
    }

    // 2. Check joinedParticipants (folder/quiz participants)
    const isInParticipants = resource.joinedParticipants?.some(p => String(p.userId) === uid);
    
    // 3. Check private list (allowedEmails or sharedWith)
    const isInAllowedEmails = resource.allowedEmails?.includes(user.email.toLowerCase());
    const isInSharedWith = resource.sharedWith?.some(s => String(s) === uid);

    if (isInParticipants || isInAllowedEmails || isInSharedWith || resource.accessType === 'public') {
        session.participants.push(userId);
        await session.save();
        return session;
    }

    throw Object.assign(new Error('Access denied: not authorized to join this blitz'), { statusCode: 403 });
};


/**
 * Update session status (waiting → live → ended).
 */
const updateStatus = async (sessionId, hostId, status) => {
    const VALID = ['waiting', 'live', 'ended'];
    if (!VALID.includes(status)) {
        throw Object.assign(new Error('Invalid status'), { statusCode: 400 });
    }

    const session = await BlitzSession.findOne({ _id: sessionId, hostId });
    if (!session) throw Object.assign(new Error('Session not found or unauthorized'), { statusCode: 404 });

    session.status = status;
    if (status === 'live'  && !session.startedAt) session.startedAt = new Date();
    if (status === 'ended') session.endedAt = new Date();

    await session.save();
    return session;
};

/**
 * Get the latest blitz session for a target (quiz or folder).
 */
const getLatestSessionForTarget = async (targetId, type) => {
    const query = type === 'folder' ? { folderId: targetId } : { quizId: targetId };
    return BlitzSession.findOne(query).sort({ createdAt: -1 }).lean();
};

/**
 * Get the dynamic folder scoreboard.
 * Aggregates scores across child folders/quizzes.
 */
const getDynamicFolderScoreboard = async (folderId, groupBy = 'unit') => {
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
        throw Object.assign(new Error('Invalid folderId'), { statusCode: 400 });
    }

    const fid = new mongoose.Types.ObjectId(folderId);

    // 1. Find all child folders (units)
    const children = await Quiz.find({ parentId: fid }).select('_id title').lean();
    const childIds = children.map(c => c._id);

    // 2. Aggregate Results
    const pipeline = [
        // Match results where folderId is the root OR unitId is one of our children
        { 
            $match: { 
                $or: [
                    { folderId: fid },
                    { unitId: { $in: childIds } }
                ]
            } 
        },

        // Group by (user, unit) -> max score per unit
        {
            $group: {
                _id: { userId: '$userId', unitId: '$unitId' },
                maxScore: { $max: '$score' },
            }
        },

        // Group by user -> total score + unit breakdown
        {
            $group: {
                _id: '$_id.userId',
                totalScore: { $sum: '$maxScore' },
                unitBreakdown: {
                    $push: {
                        unitId: '$_id.unitId',
                        score:  '$maxScore'
                    }
                }
            }
        },

        { $sort: { totalScore: -1 } },

        // Enrich with user info
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                pipeline: [{ $project: { name: 1, email: 1, profilePhoto: 1 } }],
                as: 'user',
            }
        },
        { $unwind: '$user' },

        {
            $project: {
                _id: 0,
                userId: '$_id',
                name: '$user.name',
                email: '$user.email',
                profilePhoto: '$user.profilePhoto',
                totalScore: 1,
                unitBreakdown: 1
            }
        }
    ];

    const results = await QuizResult.aggregate(pipeline);
    return results;
};

module.exports = {
    startBlitz,
    recordResult,
    getSingleLeaderboard,
    getFolderLeaderboard,
    getSession,
    joinSession,
    updateStatus,
    getLatestSessionForTarget,
    getDynamicFolderScoreboard
};
