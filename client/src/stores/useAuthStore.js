import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
    loginUser as apiLogin,
    logoutUser as apiLogout,
    refreshAccessToken,
    registerUser as apiRegister,
    setAccessToken,
    updateMyProfile as apiUpdateProfile,
    getMySubscription,
} from '../services/api';
import { useSocketStore } from './useSocketStore';
import { useQuizStore } from './useQuizStore';

const persistOptions = {
    name: 'qb_auth_store',
    partialize: (state) => ({
        user: state.user,
    }),
};

export const useAuthStore = create()(devtools(persist((set, get) => ({
    user: null,
    token: null,
    loading: true,
    initialized: false,

    setAuthData: (data) => {
        const { token, ...safeUser } = data || {};
        setAccessToken(token || null);
        set({
            user: safeUser && Object.keys(safeUser).length ? safeUser : null,
            token: token || null,
        });

        // Initialize socket once token is available
        if (token) {
            useSocketStore.getState().connectSocket(token);
        }

        if (safeUser?.role === 'organizer' && token) {
            get().fetchSubscription();
        }

        return safeUser;
    },

    fetchSubscription: async () => {
        try {
            const data = await getMySubscription();
            if (data?.success && data?.data) {
                set((state) => ({
                    user: state.user ? {
                        ...state.user,
                        subscription: data.data.subscription,
                        plan: data.data.plan,
                        participantLimit: data.data.participantLimit,
                        commission: data.data.commission,
                        commissionPercent: data.data.commissionPercent,
                    } : null
                }));
            }
        } catch (error) {
            console.error('Failed to fetch subscription:', error);
        }
    },

    initializeAuth: async () => {
        if (get().initialized) return;

        try {
            const token = await refreshAccessToken();
            set({ token: token || null });
            
            // Connect socket if we retrieved a valid session
            if (token) {
                useSocketStore.getState().connectSocket(token);
                if (get().user?.role === 'organizer') {
                    get().fetchSubscription();
                }
            }
        } catch {
            setAccessToken(null);
            set({
                token: null,
                user: null,
            });
        } finally {
            set({ loading: false, initialized: true });
        }
    },

    login: async (email, password) => {
        const data = await apiLogin(email, password);
        return get().setAuthData(data);
    },

    register: async (name, email, password, role) => {
        const data = await apiRegister(name, email, password, role);
        return get().setAuthData(data);
    },

    logout: async () => {
        try {
            await apiLogout();
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            setAccessToken(null);
            set({
                user: null,
                token: null,
            });
            // Purge socket connection and cached state immediately on logout
            useSocketStore.getState().disconnectSocket();
            useQuizStore.getState().clearUserData();
        }
    },

    updateProfile: async (payload) => {
        const updated = await apiUpdateProfile(payload);
        const merged = {
            ...(get().user || {}),
            ...updated,
        };
        set({
            user: merged,
        });
        return merged;
    },
}), persistOptions), { name: 'authStore' }));
