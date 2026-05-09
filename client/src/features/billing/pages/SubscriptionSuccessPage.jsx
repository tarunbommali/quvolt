import React from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { CheckCircle2, PartyPopper, ArrowRight, Layout, Zap, ShieldCheck } from 'lucide-react';
import { textStyles, components, typography, buttonStyles, cards, cx } from '../../../styles/index';

const SubscriptionSuccessPage = () => {
    return (
        <Motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,var(--qb-primary-light),transparent_40%)]"
        >
            <Motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className={`${components.analytics.card} !p-12 !rounded-[4rem] max-w-2xl w-full text-center relative overflow-hidden shadow-3xl`}
            >
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />

                <div className="relative z-10 space-y-12">
                    <div className="flex justify-center">
                        <div className="relative">
                            <Motion.div 
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="w-28 h-28 rounded-full bg-emerald-500/10 flex items-center justify-center border-4 border-emerald-500/20"
                            >
                                <CheckCircle2 size={56} className="text-emerald-500" />
                            </Motion.div>
                            <Motion.div 
                                animate={{ y: [0, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className="absolute -top-4 -right-4 w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-400/20"
                            >
                                <PartyPopper size={24} className="text-white" />
                            </Motion.div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h1 className={typography.display}>Account Upgraded 🚀</h1>
                        <p className={cx(typography.body, 'max-w-md mx-auto')}>
                            You've successfully unlocked the full potential of Quvolt. Your new tools and limits are now active.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                            { icon: Zap,         label: 'Live Mode',  sub: 'Unlocked' },
                            { icon: Layout,      label: 'Analytics',  sub: 'Premium'  },
                            { icon: ShieldCheck, label: 'Host Plus',  sub: 'Active'   },
                        ].map((item, i) => (
                            <div key={i} className={cx(cards.subtle, 'flex flex-col items-center gap-2 text-center')}>
                                <item.icon size={18} className="theme-text-muted" />
                                <p className={typography.micro}>{item.label}</p>
                                <p className={typography.smallMd}>{item.sub}</p>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Link
                            to="/workspace"
                            className={cx(buttonStyles.base, buttonStyles.primary, buttonStyles.sizeLg, 'flex-1 gap-2')}
                        >
                            Start Creating <ArrowRight size={16} />
                        </Link>
                        <Link
                            to="/billing"
                            className={cx(buttonStyles.base, buttonStyles.secondary, buttonStyles.sizeLg, 'flex-1')}
                        >
                            View Billing
                        </Link>
                    </div>
                </div>
            </Motion.div>
        </Motion.div>
    );
};

export default SubscriptionSuccessPage;
