import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Receipt, AlertCircle } from 'lucide-react';
import { cards, typography, layout, cx } from '../../../styles/index';

const RecentPaymentsCard = ({ payoutSummary, inrSymbol }) => (
    <Motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className={cx(cards.elevated, "relative overflow-hidden")}
    >
        <div className={cx(layout.rowBetween, "mb-8 items-start")}>
            <div className={cx(layout.rowStart, "gap-4")}>
                <div className="w-12 h-12 rounded-xl bg-[var(--qb-primary)]/10 text-[var(--qb-primary)] flex items-center justify-center shadow-sm shrink-0">
                    <Receipt size={24} />
                </div>
                <div className="space-y-1">
                    <h2 className={typography.h2}>Transaction Vault</h2>
                    <p className={typography.metaLabel}>Verified ledger of host earnings</p>
                </div>
            </div>
            <div className={cx("hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg theme-surface-soft border theme-border")}>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className={typography.micro}>Real-time sync</span>
            </div>
        </div>

        {payoutSummary?.recent?.length ? (
            <div className="space-y-3">
                {payoutSummary.recent.slice(0, 8).map((entry, index) => (
                    <Motion.div
                        key={`${entry.quizId}-${entry.updatedAt}-${index}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cx(cards.flat, layout.rowBetween, "flex-col sm:flex-row group hover:border-[var(--qb-primary)]/30 py-4")}
                    >
                        <div className={cx(layout.rowStart, "gap-4 flex-1 w-full sm:w-auto")}>
                            <div className="w-10 h-10 rounded-lg bg-white dark:bg-black/20 flex items-center justify-center text-xs font-semibold theme-text-muted border theme-border shadow-sm shrink-0">
                                #{index + 1}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                                <p className={cx(typography.bodyStrong, "truncate")}>{entry.quizId}</p>
                                <div className={cx(layout.rowStart, "gap-2")}>
                                    <div className={cx(
                                        typography.micro,
                                        "px-2 py-0.5 rounded-md",
                                        entry.payoutStatus === 'paid' 
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' 
                                            : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                                    )}>
                                        {entry.payoutStatus}
                                    </div>
                                    <span className={cx(typography.small, "opacity-60")}>• {new Date(entry.updatedAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className={cx("flex items-center justify-end gap-6 lg:gap-12 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 theme-border")}>
                            <div className="text-right">
                                <p className={cx(typography.micro, "mb-0.5")}>Gross</p>
                                <p className={typography.bodyStrong}>{inrSymbol}{Number(entry.amount || 0).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                                <p className={cx(typography.micro, "mb-0.5")}>Fees</p>
                                <p className={cx(typography.bodyStrong, "text-red-600 dark:text-red-400")}>-{inrSymbol}{Number(entry.platformFeeAmount || 0).toLocaleString()}</p>
                            </div>
                            <div className="text-right pl-4 border-l theme-border">
                                <p className={cx(typography.micro, "text-emerald-700 dark:text-emerald-400 mb-0.5")}>Net Earning</p>
                                <p className={cx(typography.h3, "text-emerald-600 dark:text-emerald-500")}>{inrSymbol}{Number(entry.hostAmount || 0).toLocaleString()}</p>
                            </div>
                        </div>
                    </Motion.div>
                ))}
            </div>
        ) : (
            <div className={cx(cards.empty, "py-16")}>
                <div className="w-12 h-12 rounded-full theme-surface-soft flex items-center justify-center text-slate-400 mb-3">
                    <Receipt size={24} />
                </div>
                <p className={typography.small}>No transactions found</p>
            </div>
        )}

        <div className={cx(layout.rowStart, "mt-8 pt-6 border-t theme-border gap-2.5")}>
            <AlertCircle size={14} className="text-[var(--qb-primary)] shrink-0" />
            <p className={typography.small}>
                Data reflects processed settlements only. Processing usually takes 3-5 business days.
            </p>
        </div>
    </Motion.div>
);

export default RecentPaymentsCard;
