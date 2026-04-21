import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 12000);

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: API_TIMEOUT_MS,
});

apiClient.interceptors.request.use((config) => {
    const { token } = useAuthStore.getState();
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => {
        // Handle standardized success response { success: true, data: ... }
        if (response.data && response.data.success === true && Object.prototype.hasOwnProperty.call(response.data, 'data')) {
            return {
                ...response,
                data: response.data.data,
                fullResponse: response.data // Keep original for message/meta if needed
            };
        }
        return response;
    },
    async (error) => {
        const { clearAuth } = useAuthStore.getState();
        if (error.response?.status === 401) {
            clearAuth();
        }
        return Promise.reject(error);
    }
);

export default apiClient;
