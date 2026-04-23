import React from 'react';
import { motion as Motion } from 'framer-motion';
import { CheckCircle2, Loader2, Sparkles, Star, TrendingUp } from 'lucide-react';
import { typography, cards, buttonStyles, layout, cx } from '../../../styles/index';

const BILLING_PLAN_COPY = {
    FREE: {
        name: 'Free',
        price: '₹0',
        tagline: 'Core essentials for small crowds',
        points: [
            'Up to 5 Active Templates',
            '10,000 Concurrent Users',
            'Standard Analytics',
            'Community Support',
        ],
        commission: '25% Platform Commission',
        ctaLabel: 'Active Plan',
        color: 'slate',
    },
    CREATOR: {
        name: 'Creator',
        price: '₹499',
        featured: true,
        tagline: 'Advanced tools for elite educators',
        points: [
            'Up to 15 Active Templates',
            '15,000 Concurrent Users',
            'AI-Powered Intelligence',
            'Advanced Insights Engine',
            'Priority Email Support',
        ],
        commission: '10% Revenue Commission',
        ctaLabel: 'Upgrade',
        color: 'indigo',
    },
    TEAMS: {
        name: 'Teams',
        price: '₹999',
        tagline: 'Scalable institutional solutions',
        points: [
            'Up to 25 Active Templates',
            '25,000 Concurrent Users',
            'Multi-Host Collaborative Studio',
            'Cross-Session Intelligence',
            'Dedicated Account Success',
        ],
        commission: '5% Enterprise Commission',
        ctaLabel: 'Contact Enterprise',
        color: 'purple',
    },
};

const PlanGrid = ({ plans, currentPlanId, actionLoading, onUpgrade }) => {
    const container = {
        hidden: { opacity: 0 },
        show:   { opacity: 1, transition: { staggerChildren: 0.08 } },
    };
    const item = {
        hidden: { opacity: 0, y: 16 },
        show:   { opacity: 1, y: 0 },
    };

    return (
        <Motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
            {plans.map((plan) => {
                const isCurrent    = currentPlanId === plan.id;
                const copy         = BILLING_PLAN_COPY[plan.id] || {};
                const features     = copy.points || plan.features || [];
                const priceLabel   = copy.price || (plan.monthlyAmount === 0 ? '₹0' : `₹${plan.monthlyAmount / 100}`);
                const isTeamsPlan  = currentPlanId === 'TEAMS';
                const isThisFree   = plan.id === 'FREE';

                // ── Button state ──────────────────────────────────────────
                let btnLabel     = copy.ctaLabel || 'Select Plan';
                let forceDisabled = actionLoading[plan.id] || isCurrent;
                let btnVariant   = copy.featured ? buttonStyles.primary : buttonStyles.secondary;

                if (isCurrent) {
                    btnLabel     = 'Current Plan';
                    forceDisabled = true;
                    btnVariant   = 'border border-dashed theme-border theme-text-muted cursor-default';
                } else if (isTeamsPlan) {
                    btnLabel     = 'Managed by Admin';
                    forceDisabled = true;
                } else if (isThisFree) {
                    btnLabel     = 'Free Tier';
                    forceDisabled = true;
                    btnVariant   = 'theme-surface-soft theme-text-muted opacity-60 cursor-default';
                }

                return (
                    <Motion.div
                        key={plan.id}
                        variants={item}
                        className={cx(
                            cards.default,
                            'flex flex-col relative',
                            copy.featured
                                ? 'border-[var(--qb-primary)] shadow-md shadow-[var(--qb-primary)]/10'
                                : 'hover:border-[var(--qb-primary)]/30 transition-colors',
                        )}
                    >
                        {/* Featured badge */}
                        {copy.featured && (
                            <div className="absolute top-4 right-4">
                                <span className="inline-flex items-center gap-1 bg-[var(--qb-primary)] text-white text-xs font-medium px-2.5 py-0.5 rounded-full">
                                    <Star size={10} fill="currentColor" /> Popular
                                </span>
                            </div>
                        )}

                        {/* ── Plan header ──────────────────────────────── */}
                        <div className="mb-4 space-y-2">
                            <div className={layout.rowStart}>
                                <h3 className={typography.h3}>{copy.name}</h3>
                                {isCurrent && (
                                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 text-xs font-medium px-2 py-0.5 rounded-full">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                                        Active
                                    </span>
                                )}
                            </div>

                            <div className="flex items-baseline gap-1">
                                <span className={typography.metricLg}>{priceLabel}</span>
                                <span className={typography.metaLabel}>/ mo</span>
                            </div>

                            <p className={typography.small}>{copy.tagline}</p>
                        </div>

                        {/* ── Features list ────────────────────────────── */}
                        <div className="flex-1 space-y-4">
                            <p className={typography.eyebrow}>Includes</p>
                            <ul className="space-y-2">
                                {features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="mt-0.5 w-4 h-4 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                            <CheckCircle2 size={11} />
                                        </span>
                                        <span className={typography.small}>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* Commission row */}
                            <div className={cx(cards.divider)}>
                                <div className={cx(cards.flat, layout.rowStart)}>
                                    <TrendingUp size={13} className={plan.id === 'FREE' ? 'text-amber-500' : 'text-emerald-500'} />
                                    <div>
                                        <p className={typography.metaLabel}>Earning Share</p>
                                        <p className={cx(
                                            typography.bodyStrong,
                                            plan.id === 'FREE' ? '!text-amber-600' : '!text-emerald-600',
                                        )}>
                                            {copy.commission}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── CTA button ───────────────────────────────── */}
                        <Motion.button
                            whileTap={!forceDisabled ? { scale: 0.97 } : {}}
                            onClick={() => !forceDisabled && onUpgrade(plan.id)}
                            disabled={forceDisabled}
                            className={cx(
                                buttonStyles.base, buttonStyles.sizeMd,
                                'mt-4 w-full gap-1.5 justify-center',
                                btnVariant,
                                forceDisabled && 'cursor-not-allowed',
                            )}
                        >
                            {actionLoading[plan.id] ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <>
                                    {copy.featured && !isCurrent && <Sparkles size={13} />}
                                    {btnLabel}
                                </>
                            )}
                        </Motion.button>
                    </Motion.div>
                );
            })}
        </Motion.div>
    );
};

export default PlanGrid;
