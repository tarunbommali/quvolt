import { BadgeCheck, Loader2, Sparkles } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';

const PlanGrid = ({ plans, currentPlanId, actionLoading, onUpgrade, inrSymbol }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            return (
                <Card
                    key={plan.id}
                    className={`flex flex-col rounded-2xl border-2 p-4 md:p-6 transition-all ${
                        isCurrent
                            ? 'border-indigo-500 bg-indigo-50/30 ring-4 ring-indigo-50'
                            : plan.id === 'PRO'
                                ? 'border-violet-200 hover:border-violet-300'
                                : 'border-gray-100 hover:border-gray-200'
                    }`}
                >
                    <div className="flex-1 space-y-6">
                        <div className="space-y-2">
                            <h3 className="flex items-center gap-2 text-xl md:text-2xl font-semibold text-slate-900">
                                {plan.name} {isCurrent && <Sparkles size={16} className="text-yellow-500" />}
                            </h3>
                            <p className="text-sm text-slate-500">
                                {plan.monthlyAmount === 0 ? 'Forever Free' : `${inrSymbol}${plan.monthlyAmount / 100} / month`}
                            </p>
                        </div>
                        <ul className="space-y-4">
                            {plan.features.map((feature, index) => (
                                <li key={index} className="flex gap-3 text-sm font-medium text-slate-700">
                                    <BadgeCheck size={20} className={isCurrent ? 'text-indigo-600' : 'text-slate-400'} />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
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
                            'Upgrade'
                        )}
                    </Button>
                </Card>
            );
        })}
    </div>
);

export default PlanGrid;
