const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const requireRole = require('../middleware/requireRole');
const logger = require('../utils/logger');

const router = express.Router();
const PAYMENT_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:5001';
const PAYMENT_PROXY_TIMEOUT_MS = Number(process.env.PAYMENT_PROXY_TIMEOUT_MS || 8000);

const subscriptionLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many subscription requests. Please retry shortly.' },
});

const proxy = async (req, res, method, path, data, queryParams) => {
    try {
        const headers = {
            'Content-Type': 'application/json',
            'X-Correlation-ID': req.headers['x-correlation-id'] || `${Date.now()}`,
        };

        if (req.headers.authorization) {
            headers.Authorization = req.headers.authorization;
        }

        const response = await axios({
            method,
            url: `${PAYMENT_URL}${path}`,
            headers,
            timeout: PAYMENT_PROXY_TIMEOUT_MS,
            data,
            params: queryParams,
        });

        return res.status(response.status).json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        const isTimeout = error.code === 'ECONNABORTED';
        return res.status(status).json(error.response?.data || {
            error: {
                code: isTimeout ? 'PAYMENT_SERVICE_TIMEOUT' : 'PROXY_ERROR',
                message: 'Payment service temporarily unavailable. Please try again in a moment.',
            },
        });
    }
};

router.get('/plans', (req, res) => proxy(req, res, 'get', '/subscription/plans'));
router.get('/status', requireRole(['host', 'admin']), (req, res) => proxy(req, res, 'get', '/subscription/status'));
router.post('/create', subscriptionLimiter, requireRole(['host', 'admin']), (req, res) => {
    logger.audit('subscription.create.requested', {
        requestId: req.requestId,
        userId: req.user?._id,
        planId: req.body?.planId,
    });
    proxy(req, res, 'post', '/subscription/create', { planId: req.body.planId });
});

router.post('/verify', subscriptionLimiter, requireRole(['host', 'admin']), (req, res) => {
    logger.audit('subscription.verify.requested', {
        requestId: req.requestId,
        userId: req.user?._id,
        planId: req.body?.planId,
        orderId: req.body?.orderId,
    });
    proxy(req, res, 'post', '/subscription/verify', req.body);
});

router.post('/cancel', subscriptionLimiter, requireRole(['host', 'admin']), (req, res) => {
    logger.audit('subscription.cancel.requested', {
        requestId: req.requestId,
        userId: req.user?._id,
        reason: req.body?.reason,
    });
    proxy(req, res, 'post', '/subscription/cancel', req.body);
});

module.exports = router;