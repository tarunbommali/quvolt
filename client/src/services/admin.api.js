import apiClient from './apiClient';

/**
 * Admin / Global Config Service
 */
export const adminApi = {
    /**
     * Fetch subscription plans from the server (DB + Hardcoded merged)
     */
    getPlans: async () => {
        const response = await apiClient.get('/admin/plans');
        return response.data;
    },

    /**
     * Validate an offer code
     */
    validateOffer: async (code, planId) => {
        const response = await apiClient.post('/admin/offers/validate', { code, planId });
        return response.data;
    }
};
