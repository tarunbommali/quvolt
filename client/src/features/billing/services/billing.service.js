import api from '../../../services/apiClient';

// ── Subscription-only calls (no payment / payout / KYC) ────────────────────

export const getSubscriptionPlans = () =>
    api.get('/subscription/plans').then(r => r.data);

export const getMySubscription = () =>
    api.get('/subscription/status').then(r => r.data);

export const createSubscriptionOrder = (planId) =>
    api.post('/subscription/create', { planId }).then(r => r.data);

export const verifySubscriptionPayment = (orderId, paymentId, signature, planId) =>
    api.post('/subscription/verify', { orderId, paymentId, signature, planId }).then(r => r.data);

export const cancelSubscription = (reason) =>
    api.post('/subscription/cancel', { reason }).then(r => r.data);
