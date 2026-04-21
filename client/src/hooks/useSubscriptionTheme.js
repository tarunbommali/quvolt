import { useAuthStore } from '../stores/useAuthStore';
import { getThemeForPlan } from '../theme/tokens';
import { useEffect } from 'react';

export const useSubscriptionTheme = () => {
    const user = useAuthStore((state) => state.user);
    const plan = user?.subscription?.plan || 'FREE';
    const theme = getThemeForPlan(plan);

    useEffect(() => {
        // Apply CSS variables dynamically based on the plan
        const root = document.documentElement;
        
        // We set hex-based CSS variables that can be used for dynamic color logic (like color-mix)
        root.style.setProperty('--sub-primary', theme.colors.primary);
        root.style.setProperty('--sub-accent', theme.colors.accent);
        
        // This makes sure cleanup happens if needed
        return () => {
            root.style.removeProperty('--sub-primary');
            root.style.removeProperty('--sub-accent');
        };
    }, [theme]);

    return {
        plan,
        theme,
        isCreator: plan === 'CREATOR' || plan === 'TEAMS',
        isTeams: plan === 'TEAMS',
    };
};
