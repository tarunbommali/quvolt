import React from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, Loader2, X, ShieldCheck, Sparkles, CreditCard } from 'lucide-react';
import { textStyles, components } from '../../../styles/index';

const INR_SYMBOL = '₹';

const PaymentModal = ({
    isOpen,
    status,
    planName,
    amount,
    error,
    onRetry,
    onClose,
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                    <Motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
                        onClick={status !== 'processing' ? onClose : undefined}
                    />

                    <Motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        className={`${components.analytics.card} !p-0 !rounded-[3rem] w-full max-w-xl relative z-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden bg-white dark:bg-gray-900`}
                    >
                        {status !== 'processing' && (
                            <button
                                onClick={onClose}
                                className="absolute top-8 right-8 w-12 h-12 rounded-full flex items-center justify-center transition-all bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 theme-text-primary z-50 shadow-sm"
                            >
                                <X size={24} />
                            </button>
                        )}

                        <div className="p-12">
                            {status === 'pending' && (
                                <div className="space-y-10 text-center">
                                    <div className="relative mx-auto w-24 h-24">
                                        <Motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                            className="absolute inset-0 rounded-full border-[6px] border-indigo-500/10 border-t-indigo-500"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center text-indigo-500">
                                            <CreditCard size={36} className="animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-3xl font-black theme-text-primary tracking-tight">Initializing Checkout</h3>
                                        <p className="text-sm font-bold theme-text-muted">
                                            Synchronizing secure gateway for <span className="text-indigo-500 font-black uppercase tracking-widest">{planName}</span>
                                        </p>
                                    </div>
                                    <div className="rounded-[2.5rem] border theme-border bg-gray-50 dark:bg-white/5 p-10 space-y-2 shadow-inner">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] theme-text-muted opacity-60">Settlement Amount</p>
                                        <p className="text-6xl font-black theme-text-primary tracking-tighter">{INR_SYMBOL}{amount}</p>
                                    </div>
                                </div>
                            )}

                            {status === 'processing' && (
                                <div className="space-y-10 text-center py-10">
                                    <div className="relative mx-auto w-28 h-28">
                                        <Motion.div
                                            animate={{ scale: [1, 1.15, 1], rotate: [0, 180, 360] }}
                                            transition={{ repeat: Infinity, duration: 3 }}
                                            className="absolute inset-0 rounded-full bg-indigo-500/10 border-2 border-dashed border-indigo-500/30"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center text-indigo-500">
                                            <ShieldCheck size={56} className="animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-3xl font-black theme-text-primary tracking-tight">Securing Transaction</h3>
                                        <p className="text-sm font-bold theme-text-muted max-w-[280px] mx-auto">
                                            Awaiting bank authorization. <br />
                                            <span className="text-red-500 font-black uppercase tracking-[0.15em] text-[10px] mt-2 block animate-pulse">Critical: Do not close browser</span>
                                        </p>
                                    </div>
                                </div>
                            )}

                            {status === 'success' && (
                                <div className="space-y-10 text-center">
                                    <Motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="w-28 h-28 mx-auto bg-emerald-500/10 text-emerald-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-emerald-500/20"
                                    >
                                        <CheckCircle size={56} />
                                    </Motion.div>
                                    <div className="space-y-3">
                                        <h3 className="text-3xl font-black theme-text-primary tracking-tight">Activation Complete</h3>
                                        <p className="text-sm font-bold theme-text-muted">
                                            Welcome to the elite <span className="text-emerald-500 font-black uppercase tracking-widest">{planName}</span> tier
                                        </p>
                                    </div>
                                    <div className="rounded-[2.5rem] bg-emerald-500/5 p-8 border-2 border-emerald-500/20 shadow-lg">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/60 mb-2">Invoice Total</p>
                                        <p className="text-5xl font-black text-emerald-500 tracking-tighter">{INR_SYMBOL}{amount}</p>
                                    </div>
                                    <Motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={onClose}
                                        className={`${components.button.base} bg-emerald-500 hover:bg-emerald-600 text-white !rounded-2xl w-full h-16 font-black uppercase tracking-widest text-sm shadow-xl shadow-emerald-500/20`}
                                    >
                                        Access Studio
                                    </Motion.button>
                                </div>
                            )}

                            {status === 'error' && (
                                <div className="space-y-10 text-center">
                                    <div className="w-28 h-28 mx-auto bg-red-500/10 text-red-500 rounded-[2rem] flex items-center justify-center border-2 border-red-500/20">
                                        <AlertCircle size={56} />
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-3xl font-black theme-text-primary tracking-tight">Payment Denied</h3>
                                        <p className="text-sm font-bold theme-text-muted px-6">
                                            {error?.message || 'The upstream payment provider declined the transaction authorization.'}
                                        </p>
                                    </div>

                                    {error?.details && (
                                        <div className="rounded-2xl bg-red-500/[0.03] p-5 font-mono text-[10px] text-red-500/60 border border-red-500/10 break-all">
                                            PROTOCOL_ERR: {error.details}
                                        </div>
                                    )}

                                    <div className="flex gap-4">
                                        <Motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={onRetry}
                                            className={`${components.button.base} bg-indigo-500 hover:bg-indigo-600 text-white !rounded-2xl flex-1 h-16 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-indigo-500/20`}
                                        >
                                            Retry Settlement
                                        </Motion.button>
                                        <Motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={onClose}
                                            className={`${components.button.base} bg-gray-100 dark:bg-white/5 theme-text-primary !rounded-2xl flex-1 h-16 font-black uppercase tracking-widest text-[11px] border theme-border`}
                                        >
                                            Dismiss
                                        </Motion.button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default PaymentModal;

