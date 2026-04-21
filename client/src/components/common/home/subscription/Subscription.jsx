import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import Section from '../../../layout/Section';
import Container from '../../../layout/Container';
import { buttonStyles } from '../../../../styles/buttonStyles';
import PricingCard from './PricingCard';

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
const Subscription = ({ plans }) => {
    const [billingCycle, setBillingCycle] = useState('monthly');

    return (
        <Section className='py-10'>
            <Container>
                <div className="mx-auto mb-12 max-w-2xl text-center ">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--qb-primary)] mb-3">Investment</p>
                    <h2 className="text-2xl md:text-3xl font-semibold tracking-tight theme-text-primary">Simple, transparent pricing</h2>

                    <div className="mx-auto mt-2 inline-flex items-center rounded-2xl border theme-border theme-surface p-1 shadow-sm">
                        <button
                            type="button"
                            onClick={() => setBillingCycle('monthly')}
                            className={`rounded-xl px-6 py-2 text-[11px] font-semibold uppercase tracking-widest transition-all ${billingCycle === 'monthly'
                                ? 'bg-[var(--qb-primary)] text-white shadow-lg'
                                : 'theme-text-secondary hover:theme-text-primary'
                                }`}
                            aria-pressed={billingCycle === 'monthly'}
                        >
                            Monthly
                        </button>

                        <button
                            type="button"
                            onClick={() => setBillingCycle('yearly')}
                            className={`inline-flex items-center gap-2 rounded-xl px-6 py-2 text-[11px] font-semibold uppercase tracking-widest transition-all ${billingCycle === 'yearly'
                                ? 'bg-[var(--qb-primary)] text-white shadow-lg'
                                : 'theme-text-secondary hover:theme-text-primary'
                                }`}
                            aria-pressed={billingCycle === 'yearly'}
                        >
                            Yearly
                            <span className={`rounded-lg border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-tight ${billingCycle === 'yearly'
                                ? 'border-white/40 bg-white/20'
                                : 'theme-status-warning'
                                }`}>
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

                <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-[10px] font-bold uppercase tracking-widest theme-text-muted">
                    <span className="inline-flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        No credit card required
                    </span>
                    <span className="inline-flex items-center gap-2">
                        <Zap size={14} className="text-amber-500" />
                        Cancel anytime
                    </span>
                    <span className="inline-flex items-center gap-2">
                        <ShieldCheck size={14} className="text-sky-500" />
                        Secure via Razorpay
                    </span>
                </div>
            </Container>
        </Section>
    );
};


export default Subscription;
