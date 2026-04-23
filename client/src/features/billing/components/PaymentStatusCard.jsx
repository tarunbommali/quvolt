import React from 'react';
import { motion as Motion } from 'framer-motion';
import { AlertCircle, CheckCircle, XCircle, Clock, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { textStyles, components } from '../../../styles/index';

const PaymentStatusCard = ({ status, lastPaymentDate, nextPaymentDate, amount, planName }) => {
    const statusConfig = {
        success: {
            icon: CheckCircle,
            label: 'Transaction Confirmed',
            tone: 'text-emerald-500',
            bg: 'bg-emerald-500/[0.03]',
            border: 'border-emerald-500/20',
        },
        failed: {
            icon: XCircle,
            label: 'Transaction Declined',
            tone: 'text-red-500',
            bg: 'bg-red-500/[0.03]',
            border: 'border-red-500/20',
        },
        pending: {
            icon: Clock,
            label: 'Awaiting Authorization',
            tone: 'text-amber-500',
            bg: 'bg-amber-500/[0.03]',
            border: 'border-amber-500/20',
        },
        processing: {
            icon: Loader2,
            label: 'Validating Logic...',
            tone: 'text-indigo-500',
            bg: 'bg-indigo-500/[0.03]',
            border: 'border-indigo-500/20',
            animate: true
        },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
        <Motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${components.analytics.card} !p-10 !rounded-[3rem] ${config.bg} ${config.border} border-2 relative overflow-hidden`}
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${config.tone} bg-white dark:bg-white/10 shadow-xl border theme-border`}>
                        <Icon size={32} className={config.animate ? 'animate-spin' : ''} />
                    </div>
                    <div>
                        <h3 className={`text-xl font-black ${config.tone} tracking-tight`}>{config.label}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <Sparkles size={12} className="text-indigo-500/50" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] theme-text-muted opacity-60">Tier: {planName}</p>
                        </div>
                    </div>
                </div>

                <div className="text-left md:text-right p-6 rounded-[2rem] bg-white/40 dark:bg-black/20 border theme-border">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Invoice Value</p>
                    <p className={`text-4xl font-black ${config.tone} tracking-tighter`}>₹{amount}</p>
                </div>
            </div>

            {(lastPaymentDate || nextPaymentDate) && (
                <div className="mt-10 pt-10 border-t theme-border grid grid-cols-1 sm:grid-cols-2 gap-10">
                    {lastPaymentDate && (
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                                <TrendingUp size={18} />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Previous Settlement</p>
                                <p className="text-sm font-black theme-text-primary">
                                    {new Date(lastPaymentDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                            </div>
                        </div>
                    )}
                    {nextPaymentDate && (
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                <Clock size={18} />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500 opacity-60">Cycle Renewal</p>
                                <p className="text-sm font-black theme-text-primary">
                                    {new Date(nextPaymentDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Motion.div>
    );
};

export default PaymentStatusCard;
