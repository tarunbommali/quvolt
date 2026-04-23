import React from 'react';
import { Lock, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import { typography, cards, buttonStyles, layout, cx } from '../../../styles/index'

const AnalyticsSectionWrapper = ({
    title,
    description,
    accessState = "FREE_LOCKED",
    upgradePlan = "CREATOR",
    currentPlan = "FREE",
    children
}) => {
    const isLocked = accessState === "FREE_LOCKED";
    const isPaidUnlocked = accessState === "PAID_UNLOCKED";

    return (
        <section className="space-y-6 relative group">
            {/* Header with status badges */}
            <div className={cx(layout.rowBetween, "flex-col md:flex-row md:items-end gap-4 px-1")}>
                <div className="space-y-1">
                    <div className={cx(layout.rowStart, "gap-3")}>
                        <h2 className={typography.h2}>{title}</h2>
                        {isPaidUnlocked && (
                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-200 dark:border-emerald-800 shadow-sm animate-in fade-in zoom-in duration-500">
                                <CheckCircle2 size={12} /> Unlocked via Paid Quiz
                            </span>
                        )}
                    </div>
                    {description && <p className={typography.body}>{description}</p>}
                </div>

                {/* Visual indicator of the user's active tier */}
                {!isLocked && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[var(--qb-primary)]/10 text-[var(--qb-primary)] border border-[var(--qb-primary)]/20 text-[10px] font-bold uppercase tracking-wider h-fit">
                        {isPaidUnlocked ? 'Free Tier' : `${currentPlan} Tier`} Active
                    </div>
                )}
            </div>

            {/* Content Container */}
            <div className={cx("relative overflow-hidden", isLocked ? "rounded-3xl border border-dashed theme-border" : "")}>
                {/* Main Content (Blurred if locked) */}
                <div className={cx(
                    "transition-all duration-1000",
                    isLocked ? "filter blur-lg grayscale opacity-40 pointer-events-none select-none" : "opacity-100"
                )}>
                    {children}
                </div>

                {/* Lock Overlay */}
                {isLocked && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-gradient-to-t from-white/90 via-white/50 to-white/10 dark:from-gray-950/90 dark:via-gray-950/50 dark:to-gray-950/10 backdrop-blur-[2px]">
                        <Motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className={cx(
                                cards.elevated,
                                "w-full max-w-2xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group/lock"
                            )}
                        >
                            {/* Background Elements */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--qb-primary)]/5 blur-3xl rounded-full transition-all group-hover/lock:bg-[var(--qb-primary)]/10" />

                            <div className="w-14 h-14 rounded-2xl bg-[var(--qb-primary)]/10 text-[var(--qb-primary)] flex items-center justify-center shrink-0 shadow-sm">
                                <Lock size={28} />
                            </div>

                            <div className="flex-1 text-center md:text-left space-y-1">
                                <h4 className={typography.h3}>High-Performance Intel Locked</h4>
                                <p className={typography.small}>
                                    Upgrade to <span className="text-[var(--qb-primary)] font-semibold">{upgradePlan}</span> to synchronize advanced audience behavior and question cognitive data.
                                </p>
                            </div>

                            <div className="shrink-0 space-y-2 w-full md:w-auto mt-4 md:mt-0">
                                <button
                                    onClick={() => window.location.href = '/upgrade'}
                                    className={cx(buttonStyles.base, buttonStyles.primary, buttonStyles.sizeMd, "w-full md:w-auto gap-2")}
                                >
                                    <Sparkles size={16} /> Unlock Analytics
                                </button>
                                <div className={cx(layout.rowCenter, typography.micro, "text-slate-400 gap-1.5")}>
                                    <ShieldAlert size={12} /> Enterprise Secured
                                </div>
                            </div>
                        </Motion.div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default AnalyticsSectionWrapper;
