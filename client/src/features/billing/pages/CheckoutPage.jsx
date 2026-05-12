import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { Info, CheckCircle2, Zap, ShieldCheck, ArrowLeft, CreditCard, Lock, ArrowRight } from 'lucide-react';

import { useAuthStore } from '../../../stores/useAuthStore';
import { components, textStyles, panelStyles, formStyles, typography, buttonStyles, cards, layout, cx } from '../../../styles/index';

// True INR pricing matching homeData.js
const planPricing = {
    creator: {
        monthly: { price: 499, label: '₹499/month + tax' },
        yearly: { price: 4990, label: '₹4,990/year + tax' }
    },
    teams: {
        monthly: { price: 999, label: '₹999/month + tax' },
        yearly: { price: 9990, label: '₹9,990/year + tax' }
    }
};

const CheckoutPage = () => {
    const { plan } = useParams();
    const user = useAuthStore((state) => state.user);
    const [billingCycle, setBillingCycle] = useState('monthly');
    const [agreed, setAgreed] = useState(false);

    // Normalize plan name
    const planKey = plan?.toLowerCase() === 'teams' ? 'teams' : 'creator';
    const planName = planKey === 'teams' ? 'Teams Plan' : 'Creator Plan';
    const pricing = planPricing[planKey][billingCycle];

    // Plan validation logic
    const currentPlanId = user?.subscription?.plan || 'FREE';
    const isAlreadyOnThisPlan = (currentPlanId === 'CREATOR' && planKey === 'creator') || (currentPlanId === 'TEAMS' && planKey === 'teams');
    const isHigherPlan = (currentPlanId === 'TEAMS' && planKey === 'creator');
    const showBlocker = isAlreadyOnThisPlan || isHigherPlan;

    const subtotal = pricing.price;
    const tax = Math.round(subtotal * 0.18); // 18% GST (India)
    const total = subtotal + tax;

    // Calculate next month's date
    const nextDate = new Date();
    if (billingCycle === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1);
    } else {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
    }

    const handleProceedToPayment = () => {
        alert(`Initiating Razorpay checkout for ₹${total}`);
    };

    return (
        <div className={cx(layout.page, 'min-h-screen')}>
            <div className={components.home.glowWrap}>
                <div className={cx(components.home.glowOrb)} />
            </div>

            <div className="pt-20 pb-24 relative z-10">
                <div className="max-w-6xl mx-auto px-6">
                    <Motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="mb-8"
                    >
                        <Link to="/billing/upgrade" className={cx(buttonStyles.base, buttonStyles.ghost, buttonStyles.sizeSm, 'gap-1.5 mb-4')}>
                            <ArrowLeft size={14} /> Plans
                        </Link>
                        <div className="space-y-1">
                            <h1 className={typography.display}>Checkout</h1>
                            <p className={typography.body}>Confirm your plan and complete payment.</p>
                        </div>
                    </Motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                        {/* Left Column: Details & Form */}
                        <div className="lg:col-span-7 space-y-10">
                            {/* Billing Cycle */}
                            <section>
                                <p className={cx(typography.eyebrow, 'mb-3')}>Billing Cycle</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {['monthly', 'yearly'].map((cycle) => (
                                        <button
                                            key={cycle}
                                            className={`p-5 rounded-2xl border-2 text-left transition-all ${
                                                billingCycle === cycle
                                                    ? 'bg-[var(--qb-primary)]/5 border-[var(--qb-primary)]'
                                                    : 'theme-border theme-surface hover:border-[var(--qb-primary)]/30'
                                            }`}
                                            onClick={() => setBillingCycle(cycle)}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${billingCycle === cycle ? 'border-[var(--qb-primary)]' : 'theme-border'}`}>
                                                    {billingCycle === cycle && <div className="w-2 h-2 rounded-full bg-[var(--qb-primary)]" />}
                                                </div>
                                                {cycle === 'yearly' && (
                                                    <span className="text-xs font-medium bg-[var(--qb-primary)] text-white px-2.5 py-0.5 rounded-full">Save 17%</span>
                                                )}
                                            </div>
                                            <p className={typography.h3}>{cycle.charAt(0).toUpperCase() + cycle.slice(1)}</p>
                                            <p className={typography.small}>{planPricing[planKey][cycle].label}</p>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Identity Form */}
                            <Motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className={cx(cards.form, 'space-y-5')}
                            >
                                <div className={cx(layout.rowBetween, 'border-b theme-border pb-4')}>
                                    <h2 className={typography.h2}>Identity & Billing</h2>
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 text-xs font-medium">
                                        <ShieldCheck size={12} /> Encrypted
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className={cx(typography.micro, 'ml-0.5')}>Full Name</label>
                                        <input type="text" defaultValue={user?.name || ''} className="w-full h-10 theme-surface border theme-border rounded-xl px-4 text-sm theme-text-primary focus:border-[var(--qb-primary)] outline-none transition-all" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className={cx(typography.micro, 'ml-0.5')}>Email Address</label>
                                        <input type="email" defaultValue={user?.email || ''} className="w-full h-10 theme-surface border theme-border rounded-xl px-4 text-sm theme-text-primary focus:border-[var(--qb-primary)] outline-none transition-all" />
                                    </div>
                                    <div className="space-y-1.5 sm:col-span-2">
                                        <label className={cx(typography.micro, 'ml-0.5')}>GST Number (Optional)</label>
                                        <input type="text" className="w-full h-10 theme-surface border theme-border rounded-xl px-4 text-sm theme-text-primary focus:border-[var(--qb-primary)] outline-none transition-all placeholder:opacity-30 uppercase" placeholder="GSTIN: 22AAAAA0000A1Z5" />
                                    </div>
                                </div>

                                <div className="p-6 rounded-3xl bg-gray-50 dark:bg-white/5 border theme-border flex gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 flex items-center justify-center text-indigo-500 shadow-sm shrink-0">
                                        <Lock size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest theme-text-primary">Secured via Razorpay</p>
                                        <p className="text-xs font-bold theme-text-muted opacity-60 mt-1">Payments are processed using bank-grade encryption. Quvolt never stores your credit card details.</p>
                                    </div>
                                </div>

                                <label className="flex items-start gap-4 cursor-pointer pt-6 border-t theme-border group">
                                    <div
                                        className={`w-6 h-6 rounded-lg border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${agreed ? 'bg-indigo-500 border-indigo-500 shadow-lg shadow-indigo-500/20' : 'theme-border theme-surface group-hover:border-indigo-500/40'}`}
                                        onClick={() => setAgreed(!agreed)}
                                    >
                                        {agreed && <CheckCircle2 size={16} className="text-white" />}
                                    </div>
                                    <span className="text-[13px] theme-text-muted leading-relaxed font-bold group-hover:theme-text-primary transition-colors">
                                        I acknowledge that Quvolt will initialize a recurring <span className="theme-text-primary">{billingCycle}</span> charge. 
                                        Cancel any time via the billing portal. I accept the <Link to="/terms" className="text-indigo-500 underline underline-offset-4">Terms of Service</Link>.
                                    </span>
                                </label>
                            </Motion.div>
                        </div>

                        {/* Right Column: Order Summary */}
                        <div className="lg:col-span-5 space-y-8 sticky top-28">
                            <Motion.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.15 }}
                                className={cx(cards.elevated, 'space-y-4')}
                            >
                                <div className={layout.rowStart}>
                                    <CreditCard size={15} className="text-[var(--qb-primary)]" />
                                    <h2 className={typography.h3}>Order Summary</h2>
                                </div>

                                <div className="space-y-3">
                                    <div className={layout.rowBetween}>
                                        <div>
                                            <p className={typography.bodyStrong}>{planName}</p>
                                            <p className={cx(typography.micro, 'text-[var(--qb-primary)] mt-0.5')}>{billingCycle} billing</p>
                                        </div>
                                        <p className={typography.metricSm}>₹{subtotal.toLocaleString()}</p>
                                    </div>

                                    <div className="h-px theme-border" />

                                    <div className="space-y-2">
                                        <div className={layout.rowBetween}>
                                            <span className={typography.metaLabel}>Subtotal</span>
                                            <span className={typography.smallMd}>₹{subtotal.toLocaleString()}</span>
                                        </div>
                                        <div className={layout.rowBetween}>
                                            <span className={typography.metaLabel}>GST (18%)</span>
                                            <span className={typography.smallMd}>₹{tax.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="h-px theme-border" />

                                    <div className={cx(layout.rowBetween, 'py-1')}>
                                        <span className={typography.h4}>Total Due</span>
                                        <span className={typography.metricLg}>₹{total.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="mt-10 p-5 rounded-2xl bg-indigo-500/[0.03] border border-indigo-500/10 flex items-start gap-4">
                                    <Info size={16} className="text-indigo-500 shrink-0 mt-1" />
                                    <p className="text-xs font-bold theme-text-muted leading-relaxed">
                                        Next cycle initialization on <span className="theme-text-primary">{nextDate.toLocaleDateString()}</span>. 
                                        Expected contribution: <span className="theme-text-primary">₹{total.toLocaleString()}</span>.
                                    </p>
                                </div>

                                {showBlocker ? (
                                    <div className={cx(cards.flat, 'mt-4 text-center space-y-3')}>
                                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-600">
                                            <CheckCircle2 size={18} />
                                        </div>
                                        <div>
                                            <p className={typography.bodyStrong}>Already Subscribed</p>
                                            <p className={cx(typography.small, 'mt-0.5')}>
                                                {isHigherPlan ? 'You are on a higher plan (Teams).' : `You are already on the ${planName}.`}
                                            </p>
                                        </div>
                                        <Link to="/billing" className={cx(buttonStyles.base, buttonStyles.ghost, buttonStyles.sizeSm, 'mx-auto gap-1')}>
                                            Back to Billing <ArrowRight size={12} />
                                        </Link>
                                    </div>
                                ) : (
                                    <button
                                        className={cx(
                                            buttonStyles.base, buttonStyles.sizeLg, 'w-full mt-4',
                                            agreed ? buttonStyles.primary : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed opacity-50'
                                        )}
                                        disabled={!agreed}
                                        onClick={agreed ? handleProceedToPayment : undefined}
                                    >
                                        Confirm & Pay <ArrowRight size={16} />
                                    </button>
                                )}

                                <div className="flex items-center justify-center gap-8 mt-8 opacity-40">
                                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest theme-text-muted">
                                        <Zap size={12} fill="currentColor" /> Live Sync
                                    </div>
                                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest theme-text-muted">
                                        <ShieldCheck size={12} /> SSL Verified
                                    </div>
                                </div>
                            </Motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
