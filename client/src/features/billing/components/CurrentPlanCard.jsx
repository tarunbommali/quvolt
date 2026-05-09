import React from 'react';
import { motion as Motion } from 'framer-motion';
import { AlertCircle, Loader2, Sparkles, Zap, Layout, Activity, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { typography, cards, buttonStyles, layout, cx } from '../../../styles/index';

const CurrentPlanCard = ({
    currentPlanId,
    subStatus,
    expiryDate,
    participantLimit,
    commissionPercent,
    actionLoading,
    onCancel,
    usage,
    limitFree
}) => {
    const isPremium = currentPlanId === 'TEAMS';
    const isCreator = currentPlanId === 'CREATOR';
    const isFree    = currentPlanId === 'FREE';

    const isUnlimited = limitFree === 'Unlimited';
    const progressPercent = isUnlimited
        ? 100
        : Math.min((usage.freeCreated / limitFree) * 100, 100);

    return (
        <Motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative p-8 rounded-2xl bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.08)] space-y-6 overflow-hidden"
        >
            {/* Header Area */}
            <div className={layout.rowBetween}>
                <div className="space-y-1">
                    <div className={cx(layout.rowStart, "gap-2 mb-1")}>
                        <div className={cx(
                            "w-6 h-6 rounded-lg flex items-center justify-center",
                            isPremium ? "bg-indigo-500 text-white" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                        )}>
                            {isPremium ? <Sparkles size={12} /> : <Zap size={12} />}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Current Plan</span>
                    </div>
                    <div className={layout.rowStart}>
                        <h2 className="text-xl font-semibold theme-text-primary tracking-tight">{currentPlanId}</h2>
                        <span className={cx(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider",
                            subStatus === 'active' 
                                ? "bg-emerald-100/80 text-emerald-600 border-emerald-200" 
                                : "bg-amber-100/80 text-amber-600 border-amber-200"
                        )}>
                            ● {subStatus}
                        </span>
                    </div>
                </div>

                <div className="shrink-0">
                    {(isFree || isCreator) ? (
                        <Link
                            to="/upgrade"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold shadow-md hover:scale-[1.02] transition-all active:scale-[0.98]"
                        >
                            <Sparkles size={14} />
                            Upgrade
                        </Link>
                    ) : (
                        <button
                            onClick={onCancel}
                            disabled={actionLoading.cancel}
                            className="text-xs font-medium text-red-500/70 hover:text-red-500 transition-colors flex items-center gap-1.5"
                        >
                            {actionLoading.cancel ? <Loader2 size={12} className="animate-spin" /> : 'Cancel Subscription'}
                        </button>
                    )}
                </div>
            </div>

            {/* Core Metrics */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/60 dark:bg-neutral-800/40 border border-white/10 rounded-xl px-4 py-3 space-y-1 transition-all hover:bg-white/80 dark:hover:bg-neutral-800/60">
                    <p className="text-[10px] uppercase tracking-wide opacity-60 font-bold">Participant Limit</p>
                    <p className="text-lg font-semibold theme-text-primary">
                        {participantLimit?.toLocaleString()}
                        <span className="text-xs font-normal opacity-40 ml-1">/room</span>
                    </p>
                </div>

                <div className="bg-white/60 dark:bg-neutral-800/40 border border-white/10 rounded-xl px-4 py-3 space-y-1 transition-all hover:bg-white/80 dark:hover:bg-neutral-800/60">
                    <p className="text-[10px] uppercase tracking-wide opacity-60 font-bold">Commission</p>
                    <p className="text-lg font-semibold text-emerald-600">
                        {commissionPercent}%
                    </p>
                </div>
            </div>

            {/* Usage Block */}
            <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                <div className={layout.rowBetween}>
                    <div className="flex items-center gap-2">
                        <Layout size={14} className="opacity-60" />
                        <span className="text-xs uppercase tracking-wide opacity-60 font-bold">Template Usage</span>
                    </div>
                    <div className="text-right">
                        <span className="text-sm font-semibold theme-text-primary">{usage.freeCreated}</span>
                        <span className="text-xs opacity-40 mx-1">/</span>
                        <span className="text-xs opacity-40">{limitFree}</span>
                    </div>
                </div>

                <div className="h-2.5 rounded-full bg-neutral-200/50 dark:bg-neutral-800/50 overflow-hidden border border-white/5">
                    <Motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 1.2, ease: "circOut" }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-inner"
                    />
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/50 dark:bg-neutral-800/50 border border-white/5">
                        <Activity size={12} className="text-emerald-500" />
                        <div>
                            <p className="text-[10px] opacity-40 font-bold">PAID</p>
                            <p className="text-xs font-semibold">{usage.paidCreated}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/50 dark:bg-neutral-800/50 border border-white/5">
                        <Users size={12} className="text-indigo-500" />
                        <div>
                            <p className="text-[10px] opacity-40 font-bold">CAPACITY</p>
                            <p className="text-xs font-semibold">{participantLimit?.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            {expiryDate && (
                <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 bg-white/40 dark:bg-neutral-800/30 px-3 py-2 rounded-lg border border-white/5">
                    <AlertCircle size={12} />
                    <span>
                        Next billing cycle begins: 
                        <span className="ml-1 font-semibold theme-text-primary">
                            {new Date(expiryDate).toLocaleDateString(undefined, {
                                month: 'short', day: 'numeric', year: 'numeric'
                            })}
                        </span>
                    </span>
                </div>
            )}
        </Motion.div>
    );
};

export default CurrentPlanCard;
