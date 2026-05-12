import React from 'react';
import { motion as Motion } from 'framer-motion';
import {
    Receipt,
    MoreVertical,
    TrendingUp,
    Zap,
    ArrowDownLeft,
    RotateCcw,
    Settings2,
    CheckCircle2,
    Clock,
    AlertCircle,
    Activity,
    Search, X, Filter
} from 'lucide-react';
import { cards, typography, layout, cx } from '../../../styles/index';

const STATUS_CONFIG = {
    COMPLETED: {
        label: 'Completed',
        icon: CheckCircle2,
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20'
    },
    PENDING: {
        label: 'Pending',
        icon: Clock,
        color: 'text-amber-500',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20'
    },
    PROCESSING: {
        label: 'Processing',
        icon: Activity,
        color: 'text-indigo-500',
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/20'
    },
    FAILED: {
        label: 'Failed',
        icon: AlertCircle,
        color: 'text-red-500',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20'
    }
};

const TYPE_CONFIG = {
    SUBSCRIPTION: { label: 'Subscription', icon: TrendingUp, tone: 'text-emerald-500' },
    REFUND: { label: 'Refund', icon: RotateCcw, tone: 'text-red-500' },
    ADJUSTMENT: { label: 'Manual', icon: Settings2, tone: 'text-slate-500' }
};

const TransactionLedger = ({ transactions = [], inrSymbol = '₹' }) => {
    const [searchQuery, setSearchQuery] = React.useState('');

    const filteredTransactions = React.useMemo(() => {
        if (!searchQuery.trim()) return transactions;
        const q = searchQuery.toLowerCase();
        return transactions.filter(tx =>
            tx.quizTitle?.toLowerCase().includes(q) ||
            tx.transactionId?.toLowerCase().includes(q) ||
            tx.sessionId?.toLowerCase().includes(q)
        );
    }, [transactions, searchQuery]);

    return (
        <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cx(cards.base, "overflow-hidden flex flex-col min-h-[400px] shadow-2xl shadow-indigo-500/5")}
        >
            {/* Header Area */}
            <div className="p-8 border-b theme-border flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gray-50/30 dark:bg-white/[0.01]">

                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shadow-sm">
                        <Receipt size={24} />
                    </div>
                    <div className="space-y-1">
                        <h3 className={typography.h3}>Transaction Ledger</h3>
                        <p className={typography.metaLabel}>Verified record of financial events and settlements</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search by ID or Quiz..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-white/5 border theme-border text-sm focus:border-indigo-500/50 outline-none transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-white/5 border theme-border text-sm font-medium hover:theme-surface-soft transition-all">
                        <Filter size={14} />
                        <span>Filters</span>
                    </button>

                </div>
            </div>

            {/* Table Header */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 dark:bg-white/[0.02]">
                            <th className={cx(typography.tableHeader, "px-8 py-5 border-b theme-border min-w-[140px]")}>Status</th>
                            <th className={cx(typography.tableHeader, "px-6 py-5 border-b theme-border min-w-[140px]")}>Type</th>
                            <th className={cx(typography.tableHeader, "px-6 py-5 border-b theme-border min-w-[200px]")}>Quiz / Session</th>
                            <th className={cx(typography.tableHeader, "px-6 py-5 border-b theme-border text-right min-w-[120px]")}>Amount</th>
                            <th className={cx(typography.tableHeader, "px-6 py-5 border-b theme-border min-w-[160px]")}>Date</th>
                            <th className={cx(typography.tableHeader, "px-8 py-5 border-b theme-border text-center")}></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y theme-border">
                        {filteredTransactions.length > 0 ? (
                            filteredTransactions.map((tx, i) => {
                                const status = STATUS_CONFIG[tx.status] || STATUS_CONFIG.PENDING;
                                const type = TYPE_CONFIG[tx.type] || TYPE_CONFIG.SUBSCRIPTION;

                                return (
                                    <Motion.tr
                                        key={tx.transactionId || i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group cursor-default"
                                    >
                                        <td className="px-8 py-5 whitespace-nowrap">
                                            <div className={cx(
                                                "inline-flex items-center gap-2 px-3 py-1 rounded-lg border",
                                                status.bg, status.color, status.border
                                            )}>
                                                <status.icon size={12} />
                                                <span className={typography.micro + " font-bold"}>{status.label}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex items-center gap-2.5">
                                                <div className={cx("w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-white/5", type.tone)}>
                                                    <type.icon size={14} />
                                                </div>
                                                <span className={typography.tableCellMd}>{type.label}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="space-y-0.5">
                                                <p className={cx(typography.tableCellMd, "truncate max-w-[180px]")}>{tx.quizTitle || 'Plan ' + tx.type}</p>
                                                <p className={typography.micro + " lowercase"}>#{tx.transactionId?.slice(-8) || 'tx-id'}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right whitespace-nowrap">
                                            <span className={typography.tableCellMd}>{inrSymbol}{Number(tx.amount || 0).toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="space-y-0.5">
                                                <p className={typography.tableCell}>{new Date(tx.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                                                <p className={typography.micro}>{new Date(tx.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                                <MoreVertical size={16} />
                                            </button>
                                        </td>
                                    </Motion.tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="6" className="px-8 py-32 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-40">
                                        <Receipt size={48} className="text-slate-300" />
                                        <p className={typography.body}>No transactions found in your ledger</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer / Pagination Placeholder */}
            <div className="p-6 border-t theme-border bg-gray-50/30 dark:bg-white/[0.01] flex items-center justify-between">
                <p className={typography.small}>Showing {filteredTransactions.length} results</p>
                <div className="flex gap-2">
                    <button className={cx(typography.micro, "px-4 py-2 rounded-lg border theme-border hover:theme-surface-soft transition-all")}>Export CSV</button>
                    <button className={cx(typography.micro, "px-4 py-2 rounded-lg bg-indigo-500 text-white shadow-lg shadow-indigo-500/20")}>View All</button>
                </div>
            </div>
        </Motion.div>
    );
};

export default TransactionLedger;
