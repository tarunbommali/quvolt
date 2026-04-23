import React from 'react';
import { motion as Motion } from 'framer-motion';
import { AlertCircle, Loader2, Sparkles, Zap } from 'lucide-react';
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
}) => {
    const isPremium = currentPlanId === 'TEAMS';
    const isCreator = currentPlanId === 'CREATOR';
    const isFree    = currentPlanId === 'FREE';

    return (
        <Motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={cx(
                cards.elevated,
                'relative overflow-hidden',
                isPremium && 'border-[var(--qb-primary)]/20',
            )}
        >
            <div className={layout.rowBetween + ' flex-wrap gap-6'}>
                {/* ── Left: Plan identity ──────────────────────────────── */}
                <div className="space-y-4 flex-1 min-w-0">
                    {/* Eyebrow + icon */}
                    <div className={layout.rowStart}>
                        <div className={cx(
                            'w-7 h-7 rounded-lg flex items-center justify-center',
                            isPremium ? 'bg-[var(--qb-primary)] text-white' : 'theme-surface-soft theme-text-muted',
                        )}>
                            {isPremium ? <Sparkles size={14} /> : <Zap size={14} />}
                        </div>
                        <p className={typography.eyebrow}>Current Plan</p>
                    </div>

                    {/* Plan name + status badge */}
                    <div className={layout.rowStart}>
                        <h2 className={typography.h1}>{currentPlanId}</h2>
                        <span className={cx(
                            'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
                            subStatus === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
                        )}>
                            ● {subStatus === 'active' ? 'Active' : subStatus}
                        </span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className={cx(cards.flat, 'space-y-1')}>
                            <p className={typography.metaLabel}>Participant Limit</p>
                            <p className={typography.metricMd}>
                                {participantLimit?.toLocaleString() || participantLimit}
                                <span className={cx(typography.small, 'ml-1')}>/ room</span>
                            </p>
                        </div>
                        <div className={cx(cards.flat, 'space-y-1')}>
                            <p className={typography.metaLabel}>Commission</p>
                            <p className={cx(typography.metricMd, '!text-emerald-600')}>
                                {commissionPercent}%
                            </p>
                        </div>
                    </div>

                    {expiryDate && (
                        <div className={cx(cards.flat, layout.rowStart)}>
                            <AlertCircle size={13} className="text-[var(--qb-primary)] shrink-0" />
                            <p className={typography.small}>
                                Next billing:{' '}
                                <span className="font-medium theme-text-primary">
                                    {new Date(expiryDate).toLocaleDateString(undefined, {
                                        month: 'long', day: 'numeric', year: 'numeric',
                                    })}
                                </span>
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Right: Action ────────────────────────────────────── */}
                <div className="shrink-0">
                    {(isFree || isCreator) ? (
                        <Link
                            to="/upgrade"
                            className={cx(buttonStyles.base, buttonStyles.primary, buttonStyles.sizeMd, 'gap-1.5')}
                        >
                            <Sparkles size={14} /> Upgrade Plan
                        </Link>
                    ) : (
                        <button
                            onClick={onCancel}
                            disabled={actionLoading.cancel}
                            className={cx(buttonStyles.base, buttonStyles.sizeMd, 'border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors')}
                        >
                            {actionLoading.cancel
                                ? <Loader2 size={14} className="animate-spin" />
                                : 'Cancel Subscription'}
                        </button>
                    )}
                </div>
            </div>
        </Motion.div>
    );
};

export default CurrentPlanCard;
