import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { getMyProfile } from '../features/auth/services/auth.service';

export const useAuthStore = create()(devtools(persist((set) => ({
  user: null, // { id, role, ... }
  token: null,
  isAuthenticated: false,
  loading: true,
  initialized: false,

  setAuthData: (data) => {
    // If data is null or undefined, clear auth
    if (!data) {
      set({ user: null, token: null, isAuthenticated: false });
      return;
    }

    // Handle nested user payload or flat data
    const userPayload = data.user || data;
    const token = data.token || null;

    // Ensure we have an ID to consider it a valid user
    const userToStore = userPayload?._id
      ? { 
          ...userPayload, 
          role: userPayload.role || 'participant' 
        }
      : null;

    set({
      user: userToStore,
      token: token,
      isAuthenticated: !!token && !!userToStore,
    });
  },

  clearAuth: () => {
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),

  initializeAuth: () => {
    set(() => ({
      initialized: true,
      loading: false,
    }));
  },

  // Selector for role
  getRole: () => {
    const state = useAuthStore.getState();
    return state.user?.role || null;
  },

  fetchSubscription: async () => {
    try {
      const userData = await getMyProfile();
      // userData is already unwrapped by apiClient interceptor
      const state = useAuthStore.getState();
      state.setAuthData({ user: userData, token: state.token });
      return userData;
    } catch (error) {
      console.error('[AuthStore] fetchSubscription failed:', error);
      throw error;
    }
  },

}), {
  name: 'qb_auth_store',
  partialize: (state) => ({
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    initialized: state.initialized,
  }),
})));
