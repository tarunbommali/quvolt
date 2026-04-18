import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { buttonStyles } from '../../styles/buttonStyles';

const BILLING_PLAN_COPY = {
    FREE: {
        name: 'Free',
        price: '\u20B90/month',
        tagline: 'Get started with core features',
        audience: 'Try the product risk-free',
        points: [
            'Up to 5 quizzes',
            'Up to 10,000 participants',
            'Basic analytics dashboard',
            'Public session hosting',
            'Standard support',
        ],
        commission: 'Warning: 25% platform commission',
        ctaLabel: 'Start Free',
    },
    PRO: {
        name: 'Creator',
        price: '\u20B9499/month',
        featured: true,
        tagline: 'Scale your sessions with advanced tools',
        audience: 'Best for individual educators & creators',
        points: [
            'Up to 15 quizzes',
            'Up to 15,000 participants',
            'Advanced analytics & insights',
            'AI quiz generation',
            'Private session hosting',
            'Priority support',
        ],
        upgradeNote: '+ AI generation + better analytics',
        commission: 'Value: Reduced 10% platform commission',
        ctaLabel: 'Upgrade to Creator',
    },
    PREMIUM: {
        name: 'Teams',
        price: '\u20B9999/month',
        tagline: 'Collaborate and manage at scale',
        audience: 'Built for organizations & institutions',
        points: [
            'Up to 25 quizzes',
            'Up to 25,000 participants',
            'Team collaboration (multi-host)',
            'Role-based access control',
            'Shared analytics dashboard',
            'Dedicated support',
        ],
        upgradeNote: '+ multi-host + collaboration',
        commission: 'Value: Lowest 5% platform commission',
        ctaLabel: 'Choose Teams Plan',
    },
};

const PlanGrid = ({ plans, currentPlanId, actionLoading, onUpgrade, inrSymbol }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const copy = BILLING_PLAN_COPY[plan.id] || {};
            const features = copy.points || plan.features || [];
            const priceLabel = copy.price || (plan.monthlyAmount === 0 ? `${inrSymbol}0/month` : `${inrSymbol}${plan.monthlyAmount / 100}/month`);
            const ctaLabel = copy.ctaLabel || 'Upgrade';

            return (
                <div
                    key={plan.id}
                    className={`flex flex-col rounded-2xl p-6 border transition-all ${
                        copy.featured
                            ? 'md:scale-105 border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg'
                            : 'border-gray-200 dark:border-gray-700'
                    } bg-white dark:bg-gray-800`}
                >
                    {copy.featured ? (
                        <div className="mb-0">
                            <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-full">
                                Most Popular
                            </span>
                        </div>
                    ) : null}

                    <div className="flex items-center gap-2 mt-3">
                        <h3 className="text-xl font-bold flex-1">{copy.name || plan.name}</h3>
                        {isCurrent && <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md flex items-center gap-1"><Sparkles size={12}/> Current</span>}
                    </div>
                    <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-gray-100">{priceLabel}</p>
                    {copy.tagline ? <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-300">{copy.tagline}</p> : null}
                    {copy.audience ? <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{copy.audience}</p> : null}

                    <div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-700 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Features</p>

                        <ul className="mt-3 space-y-3 text-sm">
                            {features.map((feature, index) => (
                                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-indigo-500" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {copy.upgradeNote ? (
                        <p className="mt-4 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                            {copy.upgradeNote}
                        </p>
                    ) : null}

                    {copy.commission ? (
                        <p className={`mt-4 text-sm font-semibold ${plan.id === 'FREE' ? 'theme-tone-warning' : 'text-emerald-600 dark:text-emerald-300'}`}>
                            {plan.id === 'FREE' ? 'Warning: ' : 'Value: '}{copy.commission.replace(/^(Warning|Value):\s*/, '')}
                        </p>
                    ) : null}

                    <button
                        onClick={() => onUpgrade(plan.id)}
                        disabled={actionLoading[plan.id] || isCurrent}
                        className={`${buttonStyles?.base || 'inline-flex items-center justify-center rounded-xl font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 h-10 px-4 text-sm'} ${
                            isCurrent
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500 dark:border dark:border-gray-700'
                                : (copy.featured
                                    ? (buttonStyles?.primary || 'bg-[var(--qb-primary)] text-white hover:bg-[var(--qb-primary-strong)]')
                                    : (buttonStyles?.secondary || 'theme-surface-soft theme-text-primary hover:opacity-90 border theme-border'))
                        } mt-5 w-full justify-center`}
                    >
                        {actionLoading[plan.id] ? (
                            <Loader2 size={18} className="animate-spin mx-auto" />
                        ) : isCurrent ? (
                            'Current Plan'
                        ) : currentPlanId !== 'FREE' && plan.id === 'FREE' ? (
                            'Downgrade'
                        ) : (
                            ctaLabel
                        )}
                    </button>
                </div>
            );
        })}
    </div>
);

export default PlanGrid;
