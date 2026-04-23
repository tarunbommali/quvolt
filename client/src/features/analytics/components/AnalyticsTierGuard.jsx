import React from 'react';
import { Lock } from 'lucide-react';
import { motion as Motion } from 'framer-motion';

const AnalyticsTierGuard = ({ 
    children, 
    requiredTier = 'CREATOR', 
    userTier = 'FREE',
    featureName = 'Advanced Analytics'
}) => {
    const tiers = ['FREE', 'CREATOR', 'TEAMS'];
    const userTierIndex = tiers.indexOf(userTier.toUpperCase());
    const requiredTierIndex = tiers.indexOf(requiredTier.toUpperCase());

    const isLocked = userTierIndex < requiredTierIndex;

    if (!isLocked) return children;

    return (
        <div className="relative group">
            <div className="filter blur-[4px] pointer-events-none select-none">
                {children}
            </div>
            
            <Motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/5 dark:bg-white/5 backdrop-blur-[2px] rounded-3xl border border-dashed border-[var(--qb-primary)]/20"
            >
                <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-2xl border theme-border flex flex-col items-center text-center max-w-[280px]">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--qb-primary)]/10 flex items-center justify-center mb-4">
                        <Lock className="text-[var(--qb-primary)]" size={24} />
                    </div>
                    <h3 className="text-sm font-bold theme-text-primary mb-2 uppercase tracking-widest">
                        {featureName}
                    </h3>
                    <p className="text-[11px] theme-text-muted mb-6 leading-relaxed">
                        Upgrade to <span className="text-[var(--qb-primary)] font-bold">{requiredTier}</span> to unlock actionable insights and deep analytics.
                    </p>
                    <button 
                        className="btn-premium w-full py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em]"
                        onClick={() => window.location.href = '/#pricing'}
                    >
                        Upgrade Now
                    </button>
                </div>
            </Motion.div>
        </div>
    );
};

export default AnalyticsTierGuard;
