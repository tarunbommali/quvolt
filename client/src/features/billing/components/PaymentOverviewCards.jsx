import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Activity, Wallet, ShieldCheck, AlertCircle, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { typography, layout, cx } from '../../../styles/index';

const PaymentOverviewCards = ({ paymentHealth, hostAccount, payoutCards, inrSymbol }) => {
    const cardBase = "relative p-5 rounded-2xl bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/20 shadow-[0_10px_40px_rgba(0,0,0,0.08)] overflow-hidden";
    const innerCard = "bg-white/60 dark:bg-neutral-800/40 border border-white/10 rounded-xl px-4 py-3 transition-all hover:bg-white/80 dark:hover:bg-neutral-800/60";

    return (
        <div className={layout.grid2}>
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
                            { label: 'Network Service', value: paymentHealth?.status === 'healthy' ? 'Healthy' : 'Issues', dot: 'bg-emerald-500', tone: 'text-emerald-600' },
                            { label: 'Host Identity', value: hostAccount?.accountStatus === 'verified' ? 'Verified' : 'Pending', dot: hostAccount?.accountStatus === 'verified' ? 'bg-emerald-500' : 'bg-amber-500', tone: hostAccount?.accountStatus === 'verified' ? 'text-emerald-600' : 'text-amber-600' },
                            { label: 'Payout Engine', value: hostAccount?.settlementMode || 'Automated', dot: 'bg-indigo-500', tone: 'theme-text-primary' }
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

                    <div className="space-y-4">
                        <div className={cx(
                            "rounded-xl px-4 py-3 flex items-start gap-3 border transition-colors",
                            hostAccount?.accountStatus === 'verified'
                                ? "bg-emerald-50/50 border-emerald-200/50 text-emerald-800 dark:bg-emerald-900/10 dark:text-emerald-400"
                                : "bg-amber-50/80 border-amber-200/50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
                        )}>
                            <div className="shrink-0 mt-0.5">
                                {hostAccount?.accountStatus === 'verified' ? <ShieldCheck size={14} /> : <AlertCircle size={14} />}
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium leading-none">KYC Certification</p>
                                <p className="text-[11px] opacity-70 leading-relaxed">
                                    {hostAccount?.accountStatus === 'verified'
                                        ? 'Host identity verified. Earnings are white-listed for instant payouts.'
                                        : 'Identity verification required. Payouts are currently held in secure escrow.'}
                                </p>
                            </div>
                        </div>

                        {hostAccount?.accountStatus !== 'verified' && (
                            <Motion.button
                                whileHover={{ scale: 1.02, brightness: 1.1 }}
                                whileTap={{ scale: 0.98 }}
                                type="button"
                                onClick={hostAccount?.onActionKyc}
                                disabled={hostAccount?.isLoadingKyc}
                                className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-bold shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                            >
                                {hostAccount?.isLoadingKyc ? <Loader2 size={16} className="animate-spin" /> : <>
                                    <Sparkles size={16} />
                                    <span>Complete Verification</span>
                                </>}
                            </Motion.button>
                        )}
                    </div>
                </div>
            </Motion.div>

            {/* ── Earnings Pipeline (Right Card) ── */}
            <Motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={cardBase}
            >
                <div className="space-y-6">
                    <div className={layout.rowBetween}>
                        <div className="space-y-1">
                            <div className={cx(layout.rowStart, "gap-2 mb-1")}>
                                <TrendingUp size={12} className="text-emerald-500" />
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Revenue</span>
                            </div>
                            <h3 className="text-xl font-semibold theme-text-primary tracking-tight">Earnings Pipeline</h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                            <Wallet size={20} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {payoutCards.map((card) => {
                            const toneClass = card.key === 'pending' ? 'text-neutral-500' :
                                              card.key === 'processing' ? 'text-indigo-500' :
                                              card.key === 'transferred' ? 'text-emerald-500' :
                                              card.key === 'blocked_kyc' ? 'text-red-500' : 'theme-text-primary';
                            
                            return (
                                <div key={card.key} className={innerCard}>
                                    <p className="text-[10px] uppercase tracking-wider opacity-50 font-bold mb-1">{card.label}</p>
                                    <p className={cx("text-xl font-semibold tracking-tight", toneClass)}>
                                        <span className="text-xs mr-0.5 opacity-40 font-normal">{inrSymbol}</span>
                                        {Number(card.value || 0).toLocaleString()}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-2 bg-white/40 dark:bg-neutral-800/30 px-3 py-2.5 rounded-lg border border-white/5 transition-colors hover:bg-white/60 dark:hover:bg-neutral-800/40">
                        <AlertCircle size={12} className="text-indigo-500 opacity-70" />
                        <span className="text-[10px] font-medium opacity-60 italic">
                            Settlement typical within 3-5 business days.
                        </span>
                    </div>
                </div>
            </Motion.div>
        </div>
    );
};

export default PaymentOverviewCards;
