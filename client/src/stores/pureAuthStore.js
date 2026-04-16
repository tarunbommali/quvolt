// Pure Zustand Auth Store (no side effects)
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export const useAuthStore = create()(devtools(persist((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  initialized: false,

  setAuthData: (data) => {
    set((state) => {
      const userPayload = data?.user !== undefined ? data.user : (data?._id ? data : null);
      const tokenPayload = data?.token !== undefined ? data.token : state.token;
      return {
        user: userPayload || null,
        token: tokenPayload,
        isAuthenticated: !!tokenPayload && !!userPayload,
      };
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
