import apiClient from './apiClient';

/**
 * Payment API Service
 */
/**
 * Payment API Service
 * Paths are relative to /api (from apiClient.js)
 */
export const paymentApi = {
    /**
     * Create subscription order
     * @param {string} planId - FREE, PRO, PREMIUM
     */
    createSubscriptionOrder: async (planId) => {
        return apiClient.post('/subscription/create', { planId });
    },

    /**
     * Verify subscription payment
     */
    verifySubscription: async (paymentData) => {
        return apiClient.post('/subscription/verify', paymentData);
    },

    /**
     * Create order for a specific quiz purchase
     */
    createQuizOrder: async (quizId, amount) => {
        return apiClient.post('/payment/create-order', { quizId, amount });
    },

    /**
     * Verify quiz payment
     */
    verifyQuizPayment: async (paymentData) => {
        return apiClient.post('/payment/verify', paymentData);
    },

    /**
     * Get host subscription status
     */
    getSubscriptionStatus: async () => {
        return apiClient.get('/subscription/status');
    },

    /**
     * Get quiz payment status for current user
     */
    getQuizPaymentStatus: async (quizId) => {
        return apiClient.get(`/payment/status/${quizId}`);
    },

    /**
     * Get host revenue analytics
     */
    getRevenueAnalytics: async () => {
        return apiClient.get('/payment/revenue/total');
    }
};
