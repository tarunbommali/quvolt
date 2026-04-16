import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export const useAuthStore = create()(devtools(persist((set) => ({
  user: null, // { id, role, ... }
  token: null,
  isAuthenticated: false,
  loading: true,
  initialized: false,

  setAuthData: (data) => {
    const isNested = !!data?.user;
    const userPayload = isNested ? data.user : data;
    const userToStore = userPayload?._id
      ? { ...userPayload, role: userPayload.role === 'host' ? 'host' : userPayload.role }
      : null;

    set({
      user: userToStore,
      token: data?.token || null,
      isAuthenticated: !!data?.token && !!userToStore,
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
