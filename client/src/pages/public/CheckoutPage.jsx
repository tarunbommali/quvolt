import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Info, CheckCircle2, Zap, ShieldCheck } from 'lucide-react';
import Footer from '../../components/common/Footer';
import { components } from '../../styles/components';
import { cx } from '../../styles/theme';
import { useAuthStore } from '../../stores/useAuthStore';

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
    const planName = planKey === 'teams' ? 'Teams plan' : 'Creator plan';
    const pricing = planPricing[planKey][billingCycle];
    
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
        // In a real flow, this would call the backend to create a Razorpay Order
        // and then open the Razorpay checkout modal.
        alert(`Initiating Razorpay checkout for ₹${total}`);
    };

    return (
        <div className={components.home.page}>
            <div className={components.home.glowWrap}>
                <div className={cx(components.home.glowOrb)} />
            </div>
            
            <div className="pt-12 pb-20 min-h-screen">
                <div className="max-w-xl mx-auto px-6">
                    <h1 className="text-2xl font-semibold theme-text-primary mb-8 tracking-tight">Complete your upgrade</h1>
                    
                    {/* Billing Cycle Toggle */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <button 
                            className={`p-4 rounded-xl border text-left transition-all ${billingCycle === 'monthly' ? 'border-[var(--qb-primary)] bg-[var(--qb-primary)]/10' : 'theme-border theme-surface hover:border-[var(--qb-primary)]/40'}`}
                            onClick={() => setBillingCycle('monthly')}
                        >
                            <div className="flex items-center gap-3 mb-1">
                                <div className={`w-4 h-4 rounded-full border-[4px] ${billingCycle === 'monthly' ? 'border-[var(--qb-primary)] bg-white dark:bg-black' : 'theme-border bg-transparent'}`}></div>
                                <span className="font-semibold theme-text-primary">Monthly</span>
                            </div>
                            <div className="text-sm font-medium theme-text-muted ml-7">{planPricing[planKey].monthly.label}</div>
                        </button>
                        
                        <button 
                            className={`p-4 rounded-xl border text-left transition-all relative ${billingCycle === 'yearly' ? 'border-[var(--qb-primary)] bg-[var(--qb-primary)]/10' : 'theme-border theme-surface hover:border-[var(--qb-primary)]/40'}`}
                            onClick={() => setBillingCycle('yearly')}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full border-[4px] ${billingCycle === 'yearly' ? 'border-[var(--qb-primary)] bg-white dark:bg-black' : 'theme-border bg-transparent'}`}></div>
                                    <span className="font-semibold theme-text-primary">Yearly</span>
                                </div>
                                <span className="text-[10px] font-bold bg-[var(--qb-primary)]/10 text-[var(--qb-primary)] px-2.5 py-0.5 rounded-full tracking-wider uppercase">Save 17%</span>
                            </div>
                            <div className="text-sm font-medium theme-text-muted ml-7">{planPricing[planKey].yearly.label}</div>
                        </button>
                    </div>
                    
                    {/* Order Details */}
                    <div className="p-6 rounded-2xl border theme-border theme-surface shadow-sm mb-6">
                        <h2 className="text-lg font-semibold theme-text-primary mb-5">Order details</h2>
                        
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <div className="text-sm font-medium theme-text-primary">{planName}</div>
                                <div className="text-[13px] theme-text-muted capitalize">{billingCycle}</div>
                            </div>
                            <div className="text-sm font-medium theme-text-primary">₹{subtotal.toLocaleString()}</div>
                        </div>
                        
                        <div className="h-px w-full theme-border border-t my-4"></div>
                        
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-[13px]">
                                <span className="theme-text-secondary">Subtotal</span>
                                <span className="font-medium theme-text-primary">₹{subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-[13px]">
                                <span className="theme-text-secondary">GST (18%)</span>
                                <span className="font-medium theme-text-primary">₹{tax.toLocaleString()}</span>
                            </div>
                        </div>
                        
                        <div className="h-px w-full theme-border border-t my-4"></div>
                        
                        <div className="flex justify-between items-center">
                            <span className="font-semibold theme-text-primary">Total due today</span>
                            <span className="font-bold text-lg theme-text-primary">₹{total.toLocaleString()}</span>
                        </div>
                    </div>
                    
                    {/* Info Notice */}
                    <div className="p-4 rounded-2xl border theme-border theme-surface-soft mb-6 flex gap-3 text-sm theme-text-secondary shadow-sm">
                        <Info size={18} className="theme-text-muted shrink-0 mt-0.5" />
                        <p className="leading-relaxed">Your subscription will auto renew on <span className="font-medium theme-text-primary">{nextDate.toLocaleDateString()}</span>. You will be charged <span className="font-medium theme-text-primary">₹{pricing.price.toLocaleString()}/{billingCycle === 'monthly' ? 'month' : 'year'} + tax</span>.</p>
                    </div>
                    
                    {/* Billing Details (Razorpay Checkout Flow) */}
                    <div className="p-6 rounded-2xl border theme-border theme-surface shadow-sm mb-6 space-y-5">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-semibold theme-text-primary">Billing Details</h2>
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--qb-primary)] bg-[var(--qb-primary)]/10 px-2.5 py-1 rounded-md">
                                <ShieldCheck size={12} /> Secure via Razorpay
                            </span>
                        </div>
                        
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider theme-text-muted block">Full name</label>
                            <input type="text" defaultValue={user?.name || ''} className="w-full theme-surface-soft border theme-border rounded-xl px-4 py-3 theme-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-[var(--qb-primary)]/30 focus:border-[var(--qb-primary)] transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600" placeholder="John Doe" />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider theme-text-muted block">Email Address</label>
                            <input type="email" defaultValue={user?.email || ''} className="w-full theme-surface-soft border theme-border rounded-xl px-4 py-3 theme-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-[var(--qb-primary)]/30 focus:border-[var(--qb-primary)] transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600" placeholder="john@example.com" />
                        </div>
                        
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider theme-text-muted block">Phone Number</label>
                            <div className="flex gap-2">
                                <select className="w-24 theme-surface-soft border theme-border rounded-xl px-2 py-3 theme-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-[var(--qb-primary)]/30 focus:border-[var(--qb-primary)] transition-all appearance-none text-center bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.5rem_center]">
                                    <option>+91</option>
                                    <option>+1</option>
                                    <option>+44</option>
                                </select>
                                <input type="tel" className="flex-1 theme-surface-soft border theme-border rounded-xl px-4 py-3 theme-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-[var(--qb-primary)]/30 focus:border-[var(--qb-primary)] transition-all" placeholder="98765 43210" />
                            </div>
                        </div>

                        <div className="space-y-2 pt-3 border-t theme-border mt-5">
                            <label className="text-sm font-semibold theme-text-primary block">Business tax ID <span className="theme-text-muted font-normal">(Optional)</span></label>
                            <p className="text-[13px] theme-text-muted mb-2">If you provide a GST number, invoices will be generated for your business.</p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <span className="text-xs font-semibold uppercase tracking-wider theme-text-muted sm:w-36">Indian GST</span>
                                <input type="text" className="flex-1 theme-surface-soft border theme-border rounded-xl px-4 py-3 theme-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-[var(--qb-primary)]/30 focus:border-[var(--qb-primary)] transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 uppercase" placeholder="22AAAAA0000A1Z5" />
                            </div>
                        </div>
                        
                        <label className="flex items-start gap-3 cursor-pointer pt-5 border-t theme-border mt-5 group">
                            <div 
                                className={`w-5 h-5 rounded-[6px] border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${agreed ? 'bg-[var(--qb-primary)] border-[var(--qb-primary)] shadow-sm' : 'theme-border theme-surface-soft group-hover:border-gray-400'}`}
                                onClick={() => setAgreed(!agreed)}
                            >
                                {agreed && <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5 text-white"><path d="M3 7.5L5.5 10L11 4.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </div>
                            <span className="text-[13px] theme-text-secondary leading-relaxed font-medium group-hover:theme-text-primary transition-colors">
                                You agree that Quvolt will charge your payment method the amount above now, and on a recurring {billingCycle} basis until you cancel. View our <Link to="/terms" className="theme-text-primary underline decoration-[var(--qb-primary)]/40 underline-offset-4 hover:decoration-[var(--qb-primary)] transition-colors">terms of service</Link>.
                            </span>
                        </label>
                        
                        <button 
                            className={`w-full py-4 rounded-xl text-sm font-bold tracking-widest uppercase transition-all mt-8 flex items-center justify-center gap-2 ${agreed ? 'btn-primary' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}
                            disabled={!agreed}
                            onClick={agreed ? handleProceedToPayment : undefined}
                        >
                            Proceed to Pay ₹{total.toLocaleString()}
                        </button>

                        <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] font-bold uppercase tracking-widest theme-text-muted mt-6">
                            <span className="inline-flex items-center gap-1.5">
                                <CheckCircle2 size={12} className="text-emerald-500" /> Auto-renewal
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <Zap size={12} className="text-amber-500" /> Cancel anytime
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
