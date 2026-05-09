import { useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import PricingListItem from './PricingListItem';
import { useAuthStore } from '../../../../stores/useAuthStore';
import usePayment from '../../../../hooks/usePayment';
import { typography, cards, layout, buttonStyles, cx } from '../../../../styles/index';
import { Sparkles, TrendingUp } from 'lucide-react';

const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
};

const PricingCard = ({ plan }) => {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuthStore();
    const { processSubscription } = usePayment();

    const currentPlanId = user?.subscription?.plan || 'FREE';
    const isCurrent = currentPlanId === plan.name.toUpperCase() || (currentPlanId === 'CREATOR' && plan.name === 'Creator') || (currentPlanId === 'TEAMS' && plan.name === 'Teams');
    const isTeamsPlan = currentPlanId === 'TEAMS';
    const isThisTeams = plan.name === 'Teams';
    const isThisFree = plan.name === 'Free';

    const handleAction = (e) => {
        if (plan.isComingSoon || isCurrent || isTeamsPlan || isThisTeams || isThisFree) return;

        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        if (plan.name === 'Free') {
            navigate('/dashboard');
            return;
        }

        processSubscription(plan.name.toUpperCase(), (sub) => {
            navigate('/dashboard');
        });
    };

    let btnLabel = plan.ctaLabel;
    let forceDisabled = plan.isComingSoon;

    if (isAuthenticated) {
        if (isCurrent) {
            btnLabel = 'Current Plan';
            forceDisabled = true;
        } else if (isTeamsPlan) {
            btnLabel = 'Plan Managed';
            forceDisabled = true;
        } else if (isThisTeams) {
            btnLabel = 'Contact Admin';
            forceDisabled = true;
        } else if (isThisFree) {
            btnLabel = 'Included';
            forceDisabled = true;
        }
    }

    return (
        <Motion.div
            variants={fadeUp}
            whileHover={{ y: -8 }}
            className={cx(
                plan.featured ? cards.elevated : cards.default,
                'relative flex flex-col h-full !p-8 !rounded-[2.5rem] transition-all duration-500 overflow-hidden',
                plan.featured && 'border-[var(--qb-primary)] ring-4 ring-[var(--qb-primary)]/5'
            )}
        >
            {/* Header / Badge */}
            <div className={cx(layout.rowBetween, "items-start")}>
                <h3 className={cx(typography.micro, "text-[var(--qb-primary)] font-bold")}>
                    {plan.name}
                </h3>
                {plan.badge && (
                    <span className={cx(
                        typography.micro,
                        "px-3 py-1 rounded-lg font-bold border",
                        plan.featured
                            ? 'bg-[var(--qb-primary)] text-white border-[var(--qb-primary)]'
                            : 'theme-surface-soft theme-text-secondary theme-border'
                    )}>
                        {plan.badge}
                    </span>
                )}
            </div>

            {/* Price Area */}
            <div className="mb-2">
                <div className="flex items-baseline gap-1">
                    <span className={typography.metricMd}>
                        {plan.price}
                    </span>
                    <span className={cx(typography.metaLabel, "opacity-60")}>
                        {plan.period}
                    </span>
                </div>
                {plan.tagline && (
                    <p className={cx(typography.small, "mt-1 opacity-70")}>{plan.tagline}</p>
                )}
            </div>

            {/* Features Section */}
            <div className="mt-2 pt-2 border-t theme-border flex-1 flex flex-col">
                <p className={cx(typography.eyebrow, "mb-4 opacity-60")}>
                    Plan Features
                </p>

                <ul className="space-y-2 mb-4">
                    {plan.points.map((point, idx) => (
                        <PricingListItem key={`${plan.name}-${idx}`} point={point} plan={plan} />
                    ))}
                </ul>

                {/* Commission / Earning Share */}
                <div className="mt-auto">
                    <div className={cx(
                        cards.flat,
                        layout.rowBetween,
                        "p-4 !rounded-2xl border-dashed border theme-border",
                        plan.name === 'Free' ? 'bg-amber-500/5' : (plan.name === 'Creator' ? 'bg-indigo-500/5' : 'bg-emerald-500/5')
                    )}>
                        <div className="space-y-0.5">
                            <p className={typography.micro}>Net Commission</p>
                            <p className={cx(
                                typography.h4,
                                plan.name === 'Free' ? 'text-amber-600' : (plan.name === 'Creator' ? 'text-indigo-600' : 'text-emerald-600')
                            )}>
                                {plan.commission}
                            </p>
                        </div>
                        <TrendingUp size={16} className={plan.name === 'Free' ? 'text-amber-500' : (plan.name === 'Creator' ? 'text-indigo-500' : 'text-emerald-500')} />
                    </div>
                </div>
            </div>

            {/* Action CTA */}
            <div className="mt-8">
                <button
                    type="button"
                    onClick={handleAction}
                    disabled={forceDisabled}
                    className={cx(
                        buttonStyles.base,
                        plan.featured ? buttonStyles.primary : buttonStyles.secondary,
                        'w-full !py-5 !rounded-2xl justify-center gap-2',
                        forceDisabled && 'opacity-50 grayscale cursor-not-allowed border-dashed'
                    )}
                >
                    {plan.featured && !forceDisabled && <Sparkles size={14} />}
                    <span className={typography.micro + " font-bold"}>{btnLabel}</span>
                </button>

                {isThisTeams && !isCurrent && isAuthenticated && (
                    <p className={cx(typography.micro, "text-center mt-3 lowercase opacity-60")}>
                        Enterprise setup required. Contact admin.
                    </p>
                )}
            </div>
        </Motion.div>
    );
};

export default PricingCard;