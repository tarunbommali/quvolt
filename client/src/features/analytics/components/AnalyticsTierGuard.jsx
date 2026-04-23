import React from 'react';
import { Lock } from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import { textStyles, components } from '../../../styles/index';

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
                <Motion.div 
                    whileHover={{ scale: 1.02 }}
                    className={components.analytics.card + " !p-6 flex flex-col items-center text-center max-w-[280px] shadow-2xl backdrop-blur-xl"}
                >
                    <div className="w-12 h-12 rounded-2xl bg-[var(--qb-primary)]/10 flex items-center justify-center mb-4">
                        <Lock className="text-[var(--qb-primary)]" size={24} />
                    </div>
                    <h3 className={textStyles.title + " mb-2 uppercase tracking-widest"}>
                        {featureName}
                    </h3>
                    <p className={textStyles.metaLabel + " mb-6 leading-relaxed normal-case"}>
                        Upgrade to <span className="text-[var(--qb-primary)] font-bold">{requiredTier}</span> to unlock actionable insights and deep analytics.
                    </p>
                    <button 
                        className={components.button.base + " " + components.button.sizes.md + " " + components.button.variants.primary + " w-full !rounded-xl text-[10px] font-bold uppercase tracking-[0.2em]"}
                        onClick={() => window.location.href = '/upgrade'}
                    >
                        Upgrade Now
                    </button>
                </Motion.div>
            </Motion.div>
        </div>
    );
};

export default AnalyticsTierGuard;

