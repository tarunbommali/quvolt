import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Activity, Wallet, ShieldCheck, AlertCircle, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { cards, typography, buttonStyles, layout, cx } from '../../../styles/index';

const PaymentOverviewCards = ({ paymentHealth, hostAccount, payoutCards, inrSymbol }) => (
    <div className={layout.grid2}>
 
        {/* ── Infrastructure Card ── */}
        <Motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className={cx(cards.elevated, "relative overflow-hidden")}
        >
            <div className="relative space-y-8">
                <div className={layout.rowBetween}>
                    <div className="space-y-1">
                        <div className={cx(layout.rowStart, "gap-2")}>
                            <Activity size={12} className="text-[var(--qb-primary)]" />
                            <p className={typography.eyebrow}>System Health</p>
                        </div>
                        <h3 className={typography.h2}>
                            Gateway & Logic
                        </h3>
                    </div>
                    <div className={cx(
                        "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transition-colors",
                        paymentHealth?.status === 'healthy' 
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                            : "bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                    )}>
                        <ShieldCheck size={24} />
                    </div>
                </div>

                <div className="space-y-3">
                    {[
                        { label: 'Network Service', value: paymentHealth?.status || 'Active', tone: paymentHealth?.status === 'healthy' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400' },
                        { label: 'Host Identity', value: hostAccount?.accountStatus || 'Pending', tone: hostAccount?.accountStatus === 'verified' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-500' },
                        { label: 'Payout Engine', value: hostAccount?.settlementMode || 'Automated', tone: 'theme-text-primary' }
                    ].map((row, i) => (
                        <div key={i} className={cx(cards.flat, layout.rowBetween, "py-4")}>
                            <span className={typography.metaLabel}>{row.label}</span>
                            <span className={cx(typography.bodyStrong, "uppercase text-xs", row.tone)}>
                                {row.value}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="space-y-4">
                    <div className={cx(
                        "rounded-2xl p-5 flex items-start gap-4 border shadow-sm",
                        hostAccount?.accountStatus === 'verified' 
                            ? "bg-emerald-50/50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/10 dark:border-emerald-800/30 dark:text-emerald-400"
                            : "bg-amber-50/50 border-amber-200 text-amber-800 dark:bg-amber-900/10 dark:border-amber-800/30 dark:text-amber-400"
                    )}>
                        <div className={cx("p-2 rounded-xl bg-white dark:bg-black/20 border theme-border shadow-sm shrink-0")}>
                            {hostAccount?.accountStatus === 'verified' ? <ShieldCheck size={18} /> : <AlertCircle size={18} />}
                        </div>
                        <div className="space-y-1">
                            <p className={cx(typography.micro, "font-bold text-current opacity-80")}>KYC Certification</p>
                            <p className={typography.small}>
                                {hostAccount?.accountStatus === 'verified'
                                    ? 'Host identity verified. Earnings are white-listed for instant automated payouts.'
                                    : 'Identity verification required. Payouts are currently held in secure escrow.'}
                            </p>
                        </div>
                    </div>

                    {hostAccount?.accountStatus !== 'verified' && (
                        <Motion.button
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={hostAccount?.onActionKyc}
                            disabled={hostAccount?.isLoadingKyc}
                            className={cx(buttonStyles.base, buttonStyles.primary, buttonStyles.sizeLg, "w-full justify-center gap-2 mt-4")}
                        >
                            {hostAccount?.isLoadingKyc ? <Loader2 size={18} className="animate-spin" /> : <>
                                <Sparkles size={16} />
                                <span>Complete Verification</span>
                            </>}
                        </Motion.button>
                    )}
                </div>
            </div>
        </Motion.div>

        {/* ── Earnings Card ── */}
        <Motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cx(cards.elevated, "relative overflow-hidden")}
        >
            <div className="relative space-y-8">
                <div className={layout.rowBetween}>
                    <div className="space-y-1">
                        <div className={cx(layout.rowStart, "gap-2")}>
                            <TrendingUp size={12} className="text-emerald-500" />
                            <p className={typography.eyebrow}>Finance Stats</p>
                        </div>
                        <h3 className={typography.h2}>
                            Earnings Pipeline
                        </h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 flex items-center justify-center shadow-sm">
                        <Wallet size={24} />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {payoutCards.map((card, idx) => (
                        <div
                            key={card.key}
                            className={cx(cards.flat, "hover:border-emerald-300 dark:hover:border-emerald-700/50 transition-colors group space-y-3")}
                        >
                            <p className={cx(typography.metaLabel, "group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors")}>
                                {card.label}
                            </p>
                            <div className="space-y-0.5">
                                <p className={cx(typography.metricLg, card.tone || 'theme-text-primary')}>
                                    <span className="text-base mr-1 opacity-50">{inrSymbol}</span>
                                    {Number(card.value || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                </p>
                                <p className={typography.micro}>Net Realized</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={cx(layout.rowStart, "gap-2 pt-2 px-3 py-2.5 rounded-xl bg-[var(--qb-primary)]/5 border border-[var(--qb-primary)]/10")}>
                    <AlertCircle size={14} className="text-[var(--qb-primary)] shrink-0" />
                    <p className={cx(typography.micro, "text-[var(--qb-primary)]/80 italic")}>
                        Settlement typical within 3-5 business days.
                    </p>
                </div>
            </div>
        </Motion.div>
    </div>
);

export default PaymentOverviewCards;
