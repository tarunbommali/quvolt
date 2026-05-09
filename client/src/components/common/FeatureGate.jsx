import React from 'react';
import { useAuthStore } from '../../stores/useAuthStore';

const featurePlans = {
    multiLanguage: ['CREATOR', 'TEAMS']
};

export const FeatureGate = ({ feature, children, fallback = null }) => {
    const { user } = useAuthStore();
    const userPlan = user?.subscription?.plan || 'FREE';
    
    if (featurePlans[feature] && !featurePlans[feature].includes(userPlan)) {
        return fallback;
    }
    
    return <>{children}</>;
};

export default FeatureGate;
