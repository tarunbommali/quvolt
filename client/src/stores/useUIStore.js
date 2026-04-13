import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const THEME_STORAGE_KEY = 'theme';

const applyThemeToRoot = (nextTheme) => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(nextTheme);
    root.setAttribute('data-theme', nextTheme);
    root.style.colorScheme = nextTheme;
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
};

const resolveInitialTheme = () => {
    if (typeof window === 'undefined') return 'light';

    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const useUIStore = create()(devtools(persist((set, get) => ({
    theme: 'light',
    modals: {},
    loadingStates: {},

    initializeTheme: () => {
        const nextTheme = resolveInitialTheme();
        applyThemeToRoot(nextTheme);
        if (get().theme !== nextTheme) {
            set({ theme: nextTheme });
        }
    },

    setTheme: (theme) => {
        const nextTheme = theme === 'light' ? 'light' : 'dark';
        applyThemeToRoot(nextTheme);
        set({ theme: nextTheme });
    },

    toggleTheme: () => {
        const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
        get().setTheme(nextTheme);
    },

    openModal: (key, payload = true) => set((state) => ({
        modals: {
            ...state.modals,
            [key]: payload,
        },
    })),

    closeModal: (key) => set((state) => ({
        modals: {
            ...state.modals,
            [key]: false,
        },
    })),

    setLoadingState: (key, value) => set((state) => ({
        loadingStates: {
            ...state.loadingStates,
            [key]: value,
        },
    })),
}), {
    name: 'qb_ui_store',
    partialize: (state) => ({
        theme: state.theme,
    }),
}), { name: 'uiStore' }));
