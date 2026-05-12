import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Activity, Wallet, ShieldCheck, AlertCircle, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { typography, layout, cx } from '../../../styles/index';

const PaymentOverviewCards = ({ paymentHealth, inrSymbol }) => {
    const cardBase = "relative p-5 rounded-2xl bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/20 shadow-[0_10px_40px_rgba(0,0,0,0.08)] overflow-hidden";
    const innerCard = "bg-white/60 dark:bg-neutral-800/40 border border-white/10 rounded-xl px-4 py-3 transition-all hover:bg-white/80 dark:hover:bg-neutral-800/60";

    return (
        <div className="max-w-md">
            {/* ── System Health (Left Card) ── */}
            <Motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className={cardBase}
            >
                <div className="space-y-6">
                    <div className={layout.rowBetween}>
                        <div className="space-y-1">
                            <div className={cx(layout.rowStart, "gap-2 mb-1")}>
                                <Activity size={12} className="text-indigo-500" />
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Infrastructure</span>
                            </div>
                            <h3 className="text-xl font-semibold theme-text-primary tracking-tight">System Health</h3>
                        </div>
                        <div className={cx(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm",
                            paymentHealth?.status === 'healthy' ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                        )}>
                            <ShieldCheck size={20} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        {[
                            { label: 'Network Service', value: paymentHealth?.status === 'healthy' ? 'Healthy' : 'Issues', dot: paymentHealth?.status === 'healthy' ? 'bg-emerald-500' : 'bg-red-500', tone: paymentHealth?.status === 'healthy' ? 'text-emerald-600' : 'text-red-600' },
                        ].map((row, i) => (
                            <div key={i} className="flex justify-between items-center px-3 py-2.5 rounded-lg bg-white/50 dark:bg-neutral-800/40 transition-colors hover:bg-white/80 dark:hover:bg-neutral-800/60">
                                <span className="text-xs font-medium opacity-60">{row.label}</span>
                                <div className="flex items-center gap-2">
                                    <span className={cx("w-1.5 h-1.5 rounded-full animate-pulse", row.dot)} />
                                    <span className={cx("text-[11px] font-bold uppercase tracking-wider", row.tone)}>
                                        {row.value}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

            </Motion.div>
        </div>
    );
};

export default PaymentOverviewCards;
