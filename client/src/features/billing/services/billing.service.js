import api from '../../../services/apiClient';

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

export const getHostPayoutSummary = () =>
    api.get('/payment/host/payout-summary').then(r => r.data);

export const getMyHostAccount = () =>
    api.get('/payment/host/account').then(r => r.data);

export const getPaymentHealth = () =>
    api.get('/payment/health', { disableRetry: true }).then(r => r.data);

export const createPaymentOrder = (quizId, amount) =>
    api.post('/payment/create-order', { quizId, amount }).then(r => r.data);

export const verifyPayment = (orderId, paymentId, signature, quizId) =>
    api.post('/payment/verify', { orderId, paymentId, signature, quizId }).then(r => r.data);

export const getPaymentStatus = (quizId) =>
    api.get(`/payment/status/${quizId}`).then(r => r.data);

export const createRazorpaySubAccount = (data) =>
    api.post('/payment/host/onboarding', data || {}).then(r => r.data);

export const getRazorpayOnboardingLink = () =>
    api.post('/payment/host/onboarding/link', {}).then(r => r.data);

export const checkRazorpayKycStatus = () =>
    api.get('/payment/host/onboarding/status').then(r => r.data);

