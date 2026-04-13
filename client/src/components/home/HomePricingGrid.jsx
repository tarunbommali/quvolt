import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import Section from '../layout/Section';
import Container from '../layout/Container';
import { buttonStyles } from '../../styles/buttonStyles';

const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
};

const stagger = {
    visible: {
        transition: {
            staggerChildren: 0.1,
        },
    },
};

/**
 * Home pricing plan cards.
 * @param {{ plans: Array<{ name: string, price: string, featured?: boolean, tagline: string, audience: string, points: string[], commission: string, ctaLabel: string, upgradeNote?: string }> }} props
 */
const HomePricingGrid = ({ plans }) => {
    const [billingCycle, setBillingCycle] = useState('monthly');

    return (
        <Section>
            <Container>
                <div className="mx-auto mb-8 max-w-2xl text-center">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Pricing</p>
                    <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Simple, transparent pricing</h2>
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">Choose a plan that fits your scale</p>

                    <div className="mx-auto mt-5 inline-flex items-center rounded-full border border-gray-200 bg-white/90 p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800/90">
                        <button
                            type="button"
                            onClick={() => setBillingCycle('monthly')}
                            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                                billingCycle === 'monthly'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100'
                            }`}
                            aria-pressed={billingCycle === 'monthly'}
                        >
                            Monthly
                        </button>

                        <button
                            type="button"
                            onClick={() => setBillingCycle('yearly')}
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                                billingCycle === 'yearly'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                            }`}
                            title="Yearly pricing is coming soon"
                            aria-pressed={billingCycle === 'yearly'}
                        >
                            Yearly
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                                billingCycle === 'yearly'
                                    ? 'border-white/60 bg-white/15 text-white'
                                    : 'theme-status-warning'
                            }`}>
                                Soon
                            </span>
                        </button>
                    </div>

                    {billingCycle === 'yearly' ? (
                        <p className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-300">
                            Yearly billing unlocks 2 months free - launching soon
                        </p>
                    ) : null}
                </div>

                <Motion.div
                    variants={stagger}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="grid md:grid-cols-3 gap-6"
                >
                    {plans.map((plan) => (
                        <PricingCard key={plan.name} plan={plan} />
                    ))}
                </Motion.div>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 dark:border-gray-700">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        No credit card required
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 dark:border-gray-700">
                        <Zap size={14} className="text-indigo-500" />
                        Cancel anytime
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 dark:border-gray-700">
                        <ShieldCheck size={14} className="text-sky-500" />
                        Secure payments via Razorpay
                    </span>
                </div>
            </Container>
        </Section>
    );
};

const PricingCard = ({ plan }) => (
    <Motion.div
        variants={fadeUp}
        whileHover={{ y: -8 }}
        className={`rounded-2xl p-6 border transition-all ${
            plan.featured
                ? 'md:scale-105 border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg'
                : 'border-gray-200 dark:border-gray-700'
        } bg-white dark:bg-gray-800`}
    >
        {plan.featured ? (
            <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-full">
                Most Popular
            </span>
        ) : null}

        <h3 className="text-xl font-bold mt-3">{plan.name}</h3>
        <p className="text-3xl font-bold mt-2">{plan.price}</p>
        <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-300">{plan.tagline}</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{plan.audience}</p>

        <div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-700">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Features</p>

            <ul className="mt-3 space-y-3 text-sm">
                {plan.points.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-indigo-500" />
                        <span>{point}</span>
                    </li>
                ))}
            </ul>
        </div>

        {plan.upgradeNote ? (
            <p className="mt-4 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                {plan.upgradeNote}
            </p>
        ) : null}

        <p className={`mt-4 text-sm font-semibold ${plan.name === 'Free' ? 'theme-tone-warning' : 'text-emerald-600 dark:text-emerald-300'}`}>
            {plan.name === 'Free' ? 'Warning: ' : 'Value: '}{plan.commission}
        </p>

        <Link
            to="/register"
            className={`${buttonStyles.base} ${plan.featured ? buttonStyles.primary : buttonStyles.secondary} mt-5 w-full justify-center`}
        >
            {plan.ctaLabel}
        </Link>
    </Motion.div>
);

export default HomePricingGrid;
