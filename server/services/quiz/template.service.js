/**
 * template.service.js
 *
 * Business logic for QuizTemplate CRUD and plan-gating.
 *
 * Rules:
 *  - Every host gets one "Standard Quiz" default template on registration.
 *  - Creator/Teams hosts can create up to 10/50 custom templates.
 *  - The scoring engine reads config only from session.templateConfig (snapshot).
 */
const QuizTemplate = require('../../models/QuizTemplate');
const logger = require('../../utils/logger');

// ── Plan gates ────────────────────────────────────────────────────────────────
const PLAN_TEMPLATE_LIMITS = {
    FREE:    1,
    CREATOR: 10,
    TEAMS:   50,
};

// Features locked behind paid plans
const CREATOR_FEATURES = ['negativeMarking', 'antiCheat', 'tabSwitchDetection', 'speedBonusMax'];
const TEAMS_FEATURES   = ['requireCamera'];

/**
 * Strip plan-gated advanced features from a config if the plan doesn't allow them.
 */
const enforcePlanGates = (config, plan = 'FREE') => {
    const sanitized = { ...config };

    if (plan === 'FREE') {
        if (sanitized.scoring?.negativeMarking) {
            sanitized.scoring.negativeMarking = { enabled: false, penalty: 0 };
        }
        if (sanitized.advanced) {
            sanitized.advanced = { antiCheat: false, tabSwitchDetection: false, requireCamera: false };
        }
    }

    if (plan !== 'TEAMS') {
        if (sanitized.advanced) {
            sanitized.advanced.requireCamera = false;
        }
    }

    return sanitized;
};

// ── Default Template ──────────────────────────────────────────────────────────

/**
 * Create the default "Standard Quiz" template for a new host.
 * Called automatically during user registration.
 */
const createDefaultTemplate = async (hostId) => {
    try {
        const existing = await QuizTemplate.findOne({ hostId, isDefault: true });
        if (existing) return existing;

        return await QuizTemplate.create({
            name: 'Standard Quiz',
            description: 'Default template — balanced scoring with speed bonus.',
            hostId,
            isDefault: true,
            requiredPlan: 'FREE',
            timer: { questionTime: 15, autoNext: true, interQuestionDelay: 3 },
            scoring: {
                basePoints: 100,
                speedBonus: true,
                speedBonusMax: 50,
                negativeMarking: { enabled: false, penalty: 0 },
            },
            leaderboard: { enabled: true, showLive: true, showAfterEachQuestion: true },
            flow: { shuffleQuestions: false, shuffleOptions: false, allowSkip: false },
            access: { allowLateJoin: true, maxParticipants: 200 },
            advanced: { antiCheat: false, tabSwitchDetection: false, requireCamera: false },
        });
    } catch (err) {
        logger.error('[TemplateService] createDefaultTemplate failed', { hostId, error: err.message });
        throw err;
    }
};

// ── CRUD ──────────────────────────────────────────────────────────────────────

const getTemplatesForHost = async (hostId) => {
    return QuizTemplate.find({ hostId }).sort({ isDefault: -1, createdAt: -1 }).lean();
};

const getTemplateById = async (templateId, hostId) => {
    const template = await QuizTemplate.findById(templateId).lean();
    if (!template) return null;
    if (hostId && String(template.hostId) !== String(hostId)) return null;
    return template;
};

const getDefaultTemplate = async (hostId) => {
    const tmpl = await QuizTemplate.findOne({ hostId, isDefault: true }).lean();
    if (tmpl) return tmpl;
    // Auto-create if missing (idempotent)
    return createDefaultTemplate(hostId);
};

const createTemplate = async ({ hostId, plan = 'FREE', data }) => {
    const limit = PLAN_TEMPLATE_LIMITS[plan] ?? 1;
    const count = await QuizTemplate.countDocuments({ hostId });
    if (count >= limit) {
        throw Object.assign(new Error(`Template limit reached for ${plan} plan (max ${limit})`), { statusCode: 403 });
    }

    const sanitized = enforcePlanGates(data, plan);

    return QuizTemplate.create({
        ...sanitized,
        hostId,
        isDefault: false,
        requiredPlan: 'FREE',
    });
};

const updateTemplate = async ({ templateId, hostId, plan = 'FREE', data }) => {
    const template = await QuizTemplate.findById(templateId);
    if (!template) throw Object.assign(new Error('Template not found'), { statusCode: 404 });
    if (String(template.hostId) !== String(hostId)) {
        throw Object.assign(new Error('Unauthorized'), { statusCode: 403 });
    }

    const sanitized = enforcePlanGates(data, plan);

    // Merge nested subdocuments safely
    const fields = ['timer', 'scoring', 'leaderboard', 'flow', 'access', 'advanced'];
    for (const field of fields) {
        if (sanitized[field] && typeof sanitized[field] === 'object') {
            template[field] = { ...template[field].toObject?.() ?? template[field], ...sanitized[field] };
        }
    }
    if (sanitized.name) template.name = sanitized.name;
    if (sanitized.description !== undefined) template.description = sanitized.description;

    await template.save();
    return template.toObject();
};

const deleteTemplate = async ({ templateId, hostId }) => {
    const template = await QuizTemplate.findById(templateId);
    if (!template) throw Object.assign(new Error('Template not found'), { statusCode: 404 });
    if (String(template.hostId) !== String(hostId)) {
        throw Object.assign(new Error('Unauthorized'), { statusCode: 403 });
    }
    if (template.isDefault) {
        throw Object.assign(new Error('Cannot delete the default template'), { statusCode: 400 });
    }
    await template.deleteOne();
};

const setDefaultTemplate = async ({ templateId, hostId }) => {
    const template = await QuizTemplate.findById(templateId);
    if (!template) throw Object.assign(new Error('Template not found'), { statusCode: 404 });
    if (String(template.hostId) !== String(hostId)) {
        throw Object.assign(new Error('Unauthorized'), { statusCode: 403 });
    }
    await QuizTemplate.updateMany({ hostId }, { isDefault: false });
    template.isDefault = true;
    await template.save();
    return template.toObject();
};

module.exports = {
    createDefaultTemplate,
    getTemplatesForHost,
    getTemplateById,
    getDefaultTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setDefaultTemplate,
    enforcePlanGates,
};
