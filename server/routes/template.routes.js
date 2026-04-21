const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/controllerHelpers');
const templateService = require('../services/quiz/template.service');
const logger = require('../utils/logger');

const getPlan = (user) => (user?.subscription?.plan || 'FREE').toUpperCase();

// ── GET /api/templates — list all templates for the logged-in host ────────────
router.get('/', protect, async (req, res) => {
    try {
        const templates = await templateService.getTemplatesForHost(req.user._id);
        return sendSuccess(res, templates);
    } catch (err) {
        logger.error('[TemplateRoute] getAll failed', { error: err.message });
        return sendError(res, 500, 'Failed to fetch templates');
    }
});

// ── GET /api/templates/default — get the default template ───────────────────
router.get('/default', protect, async (req, res) => {
    try {
        const template = await templateService.getDefaultTemplate(req.user._id);
        return sendSuccess(res, template);
    } catch (err) {
        logger.error('[TemplateRoute] getDefault failed', { error: err.message });
        return sendError(res, 500, 'Failed to fetch default template');
    }
});

// ── GET /api/templates/:id ───────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
    try {
        const template = await templateService.getTemplateById(req.params.id, req.user._id);
        if (!template) return sendError(res, 404, 'Template not found');
        return sendSuccess(res, template);
    } catch (err) {
        logger.error('[TemplateRoute] getById failed', { error: err.message });
        return sendError(res, 500, 'Failed to fetch template');
    }
});

// ── POST /api/templates — create a new template ──────────────────────────────
router.post('/', protect, async (req, res) => {
    try {
        const plan = getPlan(req.user);
        const template = await templateService.createTemplate({
            hostId: req.user._id,
            plan,
            data: req.body,
        });
        return sendSuccess(res, template, 'Template created', 201);
    } catch (err) {
        const code = err.statusCode || 500;
        logger.error('[TemplateRoute] create failed', { error: err.message });
        return sendError(res, code, err.message || 'Failed to create template');
    }
});

// ── PUT /api/templates/:id — update template ─────────────────────────────────
router.put('/:id', protect, async (req, res) => {
    try {
        const plan = getPlan(req.user);
        const template = await templateService.updateTemplate({
            templateId: req.params.id,
            hostId: req.user._id,
            plan,
            data: req.body,
        });
        return sendSuccess(res, template, 'Template updated');
    } catch (err) {
        const code = err.statusCode || 500;
        logger.error('[TemplateRoute] update failed', { error: err.message });
        return sendError(res, code, err.message || 'Failed to update template');
    }
});

// ── PATCH /api/templates/:id/default — set as default ────────────────────────
router.patch('/:id/default', protect, async (req, res) => {
    try {
        const template = await templateService.setDefaultTemplate({
            templateId: req.params.id,
            hostId: req.user._id,
        });
        return sendSuccess(res, template, 'Default template updated');
    } catch (err) {
        const code = err.statusCode || 500;
        logger.error('[TemplateRoute] setDefault failed', { error: err.message });
        return sendError(res, code, err.message || 'Failed to set default template');
    }
});

// ── DELETE /api/templates/:id ────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
    try {
        await templateService.deleteTemplate({
            templateId: req.params.id,
            hostId: req.user._id,
        });
        return sendSuccess(res, null, 'Template deleted');
    } catch (err) {
        const code = err.statusCode || 500;
        logger.error('[TemplateRoute] delete failed', { error: err.message });
        return sendError(res, code, err.message || 'Failed to delete template');
    }
});

module.exports = router;
