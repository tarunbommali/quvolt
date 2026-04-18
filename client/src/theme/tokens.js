export const SUBSCRIPTION_THEMES = {
    FREE: {
        id: 'free',
        label: 'Free Plan',
        colors: {
            primary: '#1E293B',
            accent: '#334155',
            gradient: 'linear-gradient(135deg, #475569 0%, #1E293B 100%)',
            bgGlow: 'transparent',
            badgeBg: 'bg-slate-100 dark:bg-slate-800',
            badgeText: 'text-slate-600 dark:text-slate-300',
            borderGlow: 'transparent',
        },
        typography: {
            logoWeight: 'font-medium',
            logoStyle: 'text-slate-600 dark:text-slate-400',
            letterSpacing: 'tracking-normal',
            bodyWeight: 'font-medium',
        },
        ui: {
            elevation: 'shadow-sm',
            glass: '',
            hover: 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
            transition: 'transition-all duration-200 ease-in-out',
        }
    },
    PRO: {
        id: 'creator',
        label: 'Creator',
        colors: {
            primary: '#2563EB',
            accent: '#7C3AED',
            gradient: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
            bgGlow: '0 4px 14px 0 rgba(37, 99, 235, 0.15)',
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
    PREMIUM: {
        id: 'teams',
        label: 'Teams',
        colors: {
            primary: '#7C3AED',
            accent: '#3B82F6',
            gradient: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 50%, #3B82F6 100%)',
            bgGlow: '0 4px 24px 0 rgba(124, 58, 237, 0.25)',
            badgeBg: 'bg-gradient-to-r from-violet-500/10 to-blue-500/10 dark:from-violet-500/20 dark:to-blue-500/20',
            badgeText: 'text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-600 dark:from-violet-400 dark:to-blue-400',
            borderGlow: 'border-violet-500/50',
        },
        typography: {
            logoWeight: 'font-bold',
            logoStyle: 'text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-500 to-blue-600 dark:from-violet-400 dark:via-indigo-400 dark:to-blue-400',
            letterSpacing: 'tracking-tight',
            bodyWeight: 'font-bold',
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
