import { useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import PricingListItem from './PricingListItem';
import { useAuthStore } from '../../../../stores/useAuthStore';
import usePayment from '../../../../hooks/usePayment';

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
            // Success callback
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
            whileHover={{ y: -10, scale: 1.02 }}
            className={`relative flex flex-col h-full  rounded-4xl p-10 border transition-all duration-500 ${plan.featured
                ? 'md:scale-105 border-[var(--qb-primary)]/50 ring-8 ring-[var(--qb-primary)]/5 shadow-[0_20px_80px_rgba(99,102,241,0.25)] z-10'
                : 'theme-border shadow-sm hover:border-[var(--qb-primary)]/30'
                } theme-surface backdrop-blur-3xl`}
        >

            {/* 🔥 Glow top line */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

            {/* Badge */}
            {plan.badge && (
                <span className={`absolute top-6 right-8 text-[9px] font-semibold uppercase tracking-[0.2em] px-4 py-2 rounded-xl ${plan.featured
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                    : 'theme-surface-soft theme-text-secondary border theme-border'
                    }`}>
                    {plan.badge}
                </span>
            )}

            {/* 🔥 TOP CONTENT */}
            <div>
                <h3 className="text-sm font-semibold uppercase tracking-widest theme-text-muted mb-2">
                    {plan.name}
                </h3>

                <div className="flex items-baseline gap-1">
                    <span className="text-2xl md:text-3xl font-semibold tracking-tighter theme-text-primary">
                        {plan.price}
                    </span>
                    <span className="text-sm font-bold theme-text-muted opacity-60">
                        {plan.period}
                    </span>
                </div>

            </div>

            {/* 🔥 FEATURES (EXPANDS) */}
            <div className="border-t theme-border pt-4 mt-4 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] theme-text-muted mb-6">
                    Plan Features
                </p>

                <ul className="space-y-5">
                    {plan.points.map((point, idx) => (
                        <PricingListItem key={`${plan.name}-${idx}`} point={point} plan={plan} />
                    ))}
                </ul>
            </div>

            {/* 🔥 COMMISSION */}
            <div className="mt-2 pt-2 border-t border-dashed theme-border">
                <div className={`p-5 rounded-3xl flex items-center justify-between ${plan.name === 'Free'
                    ? 'bg-amber-50 dark:bg-amber-900/10'
                    : plan.name === 'Creator'
                        ? 'bg-indigo-50 dark:bg-indigo-900/10'
                        : 'bg-emerald-50 dark:bg-emerald-900/10'
                    }`}>
                    <div>
                        <p className="text-[9px] font-semibold uppercase tracking-widest theme-text-muted">
                            Net Commission
                        </p>
                        <p className={`text-sm font-semibold ${plan.name === 'Free'
                            ? 'text-amber-700 dark:text-amber-400'
                            : plan.name === 'Creator'
                                ? 'text-indigo-700 dark:text-indigo-400'
                                : 'text-emerald-700 dark:text-emerald-400'
                            }`}>
                            {plan.commission}
                        </p>
                    </div>

                    {plan.featured && (
                        <div className="px-2.5 py-1.5 rounded-lg bg-[var(--qb-primary)] text-[8px] font-semibold text-white uppercase tracking-wider shadow-sm">
                            Priority
                        </div>
                    )}
                </div>
            </div>

            {/* 🔥 CTA ALWAYS BOTTOM */}
            <div className="relative group">
                <button
                    type="button"
                    onClick={handleAction}
                    disabled={forceDisabled}
                    className={`${plan.featured && !forceDisabled
                        ? 'btn-premium bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-[0_10px_40px_rgba(99,102,241,0.4)] text-white'
                        : forceDisabled
                            ? 'theme-surface-soft border border-dashed theme-border opacity-50 cursor-not-allowed theme-text-muted'
                            : 'theme-surface-soft border theme-border hover:border-indigo-500/40 theme-text-primary'
                        } mt-4 w-full h-16 flex items-center justify-center rounded-2xl font-semibold text-[12px] uppercase tracking-[0.2em] transition-all`}
                >
                    {btnLabel}
                </button>

                {/* Custom Tooltip for Teams */}
                {isThisTeams && !isCurrent && isAuthenticated && (
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-3 bg-gray-900 text-white text-[10px] rounded-xl shadow-2xl z-50 text-center animate-in fade-in zoom-in duration-200">
                        Teams plan requires enterprise setup. Contact administrator.
                    </span>
                )}
            </div>

        </Motion.div>
    );
};


export default PricingCard;