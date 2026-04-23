import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Zap, Layout, Activity, Users } from 'lucide-react';
import { typography, cards, layout, cx } from '../../../styles/index';

const UsageCards = ({ usage, limitFree, commLimit, participantLimit }) => {
    const isUnlimited    = limitFree === 'Unlimited';
    const isMaxedOut     = !isUnlimited && usage.freeCreated >= limitFree;
    const progressPercent = isUnlimited
        ? 100
        : Math.min((usage.freeCreated / limitFree) * 100, 100);

    return (
        <div className={layout.grid2}>
            {/* ── Template Quota ────────────────────────────────────────── */}
            <div className={cx(cards.default, 'space-y-4')}>
                <div className={layout.rowBetween}>
                    <div className="w-7 h-7 rounded-lg bg-[var(--qb-primary)]/10 text-[var(--qb-primary)] flex items-center justify-center">
                        <Layout size={14} />
                    </div>
                    <div className="text-right">
                        <p className={typography.metaLabel}>Templates</p>
                        <p className={typography.metricMd}>
                            {usage.freeCreated}
                            <span className={cx(typography.small, 'ml-1 opacity-40')}>/ {limitFree}</span>
                        </p>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className={layout.rowBetween}>
                        <span className={typography.metaLabel}>Usage</span>
                        <span className={cx(
                            'text-xs font-medium',
                            isMaxedOut ? 'text-red-500' : 'text-[var(--qb-primary)]',
                        )}>
                            {progressPercent.toFixed(0)}%
                        </span>
                    </div>
                    <div className="h-2 theme-surface-soft rounded-full overflow-hidden border theme-border">
                        <Motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 1.2, ease: 'circOut' }}
                            className={cx(
                                'h-full rounded-full',
                                isMaxedOut
                                    ? 'bg-red-500'
                                    : 'bg-[var(--qb-primary)]',
                            )}
                        />
                    </div>
                </div>
            </div>

            {/* ── Plan Limits ───────────────────────────────────────────── */}
            <div className={cx(cards.default, 'space-y-4')}>
                <div className={layout.rowBetween}>
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <Zap size={14} />
                    </div>
                    <div className="text-right">
                        <p className={typography.metaLabel}>Paid Templates</p>
                        <p className={typography.metricMd}>
                            {usage.paidCreated}
                            <span className={cx(typography.small, 'ml-1 opacity-40')}>/ ∞</span>
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className={cx(cards.flat, 'space-y-0.5')}>
                        <div className="flex items-center gap-1 mb-1">
                            <Activity size={11} className="text-emerald-500" />
                            <p className={typography.metaLabel}>Commission</p>
                        </div>
                        <p className={typography.metricSm}>{commLimit}%</p>
                    </div>
                    <div className={cx(cards.flat, 'space-y-0.5')}>
                        <div className="flex items-center gap-1 mb-1">
                            <Users size={11} className="theme-text-muted" />
                            <p className={typography.metaLabel}>Capacity</p>
                        </div>
                        <p className={typography.metricSm}>{participantLimit?.toLocaleString()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UsageCards;
