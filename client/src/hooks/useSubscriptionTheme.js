import { useAuthStore } from '../stores/useAuthStore';
import { getThemeForPlan } from '../theme/tokens';
import { useEffect } from 'react';

export const useSubscriptionTheme = () => {
    const user = useAuthStore((state) => state.user);
    const plan = user?.plan || 'FREE';
    const theme = getThemeForPlan(plan);

    useEffect(() => {
        // Apply CSS variables dynamically based on the plan
        const root = document.documentElement;
        
        // We set CSS variables that can be used via Tailwind or standard CSS where appropriate
        root.style.setProperty('--sub-primary', theme.colors.primary);
        root.style.setProperty('--sub-accent', theme.colors.accent);
        if (theme.colors.gradient) {
            root.style.setProperty('--sub-gradient', theme.colors.gradient);
        }
        
        // This makes sure cleanup happens if needed
        return () => {
            root.style.removeProperty('--sub-primary');
            root.style.removeProperty('--sub-accent');
            root.style.removeProperty('--sub-gradient');
        };
    }, [theme]);

    return {
        plan,
        theme,
        isPro: plan === 'PRO' || plan === 'PREMIUM',
        isPremium: plan === 'PREMIUM',
    };
};
