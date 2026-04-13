import { BadgeCheck, Loader2, Sparkles } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';

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
                <Card
                    key={plan.id}
                    className={`flex flex-col rounded-2xl border-2 p-4 md:p-6 transition-all ${
                        isCurrent
                            ? 'border-indigo-500 bg-indigo-50/30 ring-4 ring-indigo-50'
                            : copy.featured
                                ? 'border-violet-200 hover:border-violet-300'
                                : 'border-gray-100 hover:border-gray-200'
                    }`}
                >
                    <div className="flex-1 space-y-6">
                        {copy.featured ? (
                            <span className="inline-flex rounded-full bg-indigo-600 px-2 py-1 text-xs font-semibold text-white">
                                Most Popular
                            </span>
                        ) : null}

                        <div className="space-y-2">
                            <h3 className="flex items-center gap-2 text-xl md:text-2xl font-semibold text-slate-900">
                                {copy.name || plan.name} {isCurrent && <Sparkles size={16} className="theme-tone-caution" />}
                            </h3>
                            <p className="text-sm text-slate-500">{priceLabel}</p>
                            {copy.tagline ? <p className="text-sm font-medium text-slate-700">{copy.tagline}</p> : null}
                            {copy.audience ? <p className="text-xs text-slate-500">{copy.audience}</p> : null}
                        </div>

                        <div className="space-y-3 border-t border-slate-200 pt-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Features</p>
                            <ul className="space-y-4">
                                {features.map((feature, index) => (
                                    <li key={index} className="flex gap-3 text-sm font-medium text-slate-700">
                                        <BadgeCheck size={20} className={isCurrent ? 'text-indigo-600' : 'text-slate-400'} />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {copy.upgradeNote ? (
                            <p className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700">
                                {copy.upgradeNote}
                            </p>
                        ) : null}

                        {copy.commission ? (
                            <p className={`text-sm font-semibold ${plan.id === 'FREE' ? 'theme-tone-warning' : 'text-emerald-700'}`}>
                                {copy.commission}
                            </p>
                        ) : null}
                    </div>

                    <Button
                        onClick={() => onUpgrade(plan.id)}
                        disabled={actionLoading[plan.id] || isCurrent}
                        className={`mt-8 w-full rounded-xl py-3 text-sm font-medium ${
                            isCurrent
                                ? 'bg-indigo-100 text-indigo-400 cursor-not-allowed'
                                : plan.id === 'PREMIUM'
                                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20'
                        }`}
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
                    </Button>
                </Card>
            );
        })}
    </div>
);

export default PlanGrid;
