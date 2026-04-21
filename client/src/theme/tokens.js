export const SUBSCRIPTION_THEMES = {
    FREE: {
        id: 'free',
        label: 'Free Plan',
        colors: {
            primary: '#1E293B',
            accent: '#334155',
            gradient: 'bg-gradient-to-br from-slate-600 to-slate-800 dark:from-slate-700 dark:to-slate-900',
            bgGlow: 'shadow-none',
            badgeBg: 'theme-surface-soft',
            badgeText: 'theme-text-muted',
            borderGlow: 'border-transparent',
        },
        typography: {
            logoWeight: 'font-medium',
            logoStyle: 'theme-text-secondary',
            letterSpacing: 'tracking-normal',
            bodyWeight: 'font-medium',
        },
        ui: {
            elevation: 'shadow-sm',
            glass: '',
            hover: 'hover:theme-surface-soft',
            transition: 'transition-all duration-200 ease-in-out',
        }
    },
    CREATOR: {
        id: 'creator',
        label: 'Creator',
        colors: {
            primary: '#2563EB',
            accent: '#7C3AED',
            gradient: 'bg-gradient-to-br from-blue-600 to-indigo-600',
            bgGlow: 'shadow-[0_4px_14px_0_rgba(37,99,235,0.15)] dark:shadow-[0_4px_20px_0_rgba(37,99,235,0.2)]',
            badgeBg: 'bg-blue-50 dark:bg-blue-900/30',
            badgeText: 'text-blue-600 dark:text-blue-400',
            borderGlow: 'border-blue-500/30',
        },
        typography: {
            logoWeight: 'font-semibold',
            logoStyle: 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400',
            letterSpacing: 'tracking-wide',
            bodyWeight: 'font-semibold',
        },
        ui: {
            elevation: 'shadow-md shadow-blue-500/5',
            glass: '',
            hover: 'hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5',
            transition: 'transition-all duration-300 ease-out',
        }
    },
    TEAMS: {
        id: 'teams',
        label: 'Teams',
        colors: {
            primary: '#7C3AED',
            accent: '#3B82F6',
            gradient: 'bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600',
            bgGlow: 'shadow-[0_4px_24px_0_rgba(124,58,237,0.25)] dark:shadow-[0_4px_30px_0_rgba(124,58,237,0.35)]',
            badgeBg: 'bg-gradient-to-r from-violet-500/10 to-blue-500/10 dark:from-violet-500/20 dark:to-blue-500/20',
            badgeText: 'text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-600 dark:from-violet-400 dark:to-blue-400',
            borderGlow: 'border-violet-500/50',
        },
        typography: {
            logoWeight: 'font-semibold',
            logoStyle: 'text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-500 to-blue-600 dark:from-violet-400 dark:via-indigo-400 dark:to-blue-400',
            letterSpacing: 'tracking-tight',
            bodyWeight: 'font-semibold',
        },
        ui: {
            elevation: 'shadow-xl shadow-violet-500/10',
            glass: 'backdrop-blur-md bg-white/70 dark:bg-slate-900/70',
            hover: 'hover:shadow-2xl hover:shadow-violet-500/20 hover:-translate-y-1',
            transition: 'transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)',
        }
    }
};

export const getThemeForPlan = (planId) => {
    const normalizedPlan = (planId || 'FREE').toUpperCase();
    return SUBSCRIPTION_THEMES[normalizedPlan] || SUBSCRIPTION_THEMES.FREE;
};
