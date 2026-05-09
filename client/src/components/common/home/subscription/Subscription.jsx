import { useState } from 'react';
import { CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import Section from '../../../layout/Section';
import Container from '../../../layout/Container';

import PricingCard from './PricingCard';
import { typography, layout, cx } from '../../../../styles/index';

const stagger = {
    visible: {
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const Subscription = ({ plans }) => {
    const [billingCycle, setBillingCycle] = useState('monthly');

    return (
        <Container>
            <div className="mx-auto mb-12 max-w-2xl text-center ">
                <h2 className={typography.h2}>Simple, transparent pricing</h2>

                <div className="mx-auto mt-6 inline-flex items-center rounded-2xl border theme-border theme-surface p-1.5 shadow-sm">
                    <button
                        type="button"
                        onClick={() => setBillingCycle('monthly')}
                        className={cx(
                            "rounded-xl px-6 py-2 transition-all",
                            typography.micro,
                            billingCycle === 'monthly'
                                ? 'bg-[var(--qb-primary)] text-white shadow-lg font-bold'
                                : 'theme-text-secondary hover:theme-text-primary'
                        )}
                        aria-pressed={billingCycle === 'monthly'}
                    >
                        Monthly
                    </button>

                    <button
                        type="button"
                        onClick={() => setBillingCycle('yearly')}
                        className={cx(
                            "inline-flex items-center gap-2 rounded-xl px-6 py-2 transition-all",
                            typography.micro,
                            billingCycle === 'yearly'
                                ? 'bg-[var(--qb-primary)] text-white shadow-lg font-bold'
                                : 'theme-text-secondary hover:theme-text-primary'
                        )}
                        aria-pressed={billingCycle === 'yearly'}
                    >
                        Yearly
                        <span className={cx(
                            "rounded-lg border px-2 py-0.5 !text-[9px] font-bold uppercase tracking-tight",
                            billingCycle === 'yearly'
                                ? 'border-white/40 bg-white/20'
                                : 'theme-status-warning'
                        )}>
                            Soon
                        </span>
                    </button>
                </div>
            </div>

            <Motion.div
                variants={stagger}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid md:grid-cols-3 gap-8"
            >
                {plans.map((plan) => (
                    <PricingCard key={plan.name} plan={plan} />
                ))}
            </Motion.div>

            <div className="mt-16 flex flex-wrap items-center justify-center gap-8 border-t theme-border pt-12">
                <span className={cx(layout.rowStart, "gap-2", typography.micro, "font-bold opacity-60")}>
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    No credit card required
                </span>
                <span className={cx(layout.rowStart, "gap-2", typography.micro, "font-bold opacity-60")}>
                    <Zap size={16} className="text-amber-500" />
                    Cancel anytime
                </span>
                <span className={cx(layout.rowStart, "gap-2", typography.micro, "font-bold opacity-60")}>
                    <ShieldCheck size={16} className="text-sky-500" />
                    Secure via Razorpay
                </span>
            </div>
        </Container>
    );
};

export default Subscription;
