import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Lock, Smartphone, Landmark, CreditCard, ShieldCheck } from 'lucide-react';
import { textStyles, components } from '../../../styles/index';

const PaymentMethodSelector = ({ selectedMethod, onSelectMethod }) => {
    const paymentMethods = [
        {
            id: 'card',
            name: 'Cards',
            icon: CreditCard,
            description: 'Credit / Debit Cards',
            supported: true,
        },
        {
            id: 'upi',
            name: 'UPI / QR',
            icon: Smartphone,
            description: 'GPay, PhonePe, Paytm',
            supported: true,
        },
        {
            id: 'netbanking',
            name: 'Net Banking',
            icon: Landmark,
            description: 'Direct bank transfer',
            supported: true,
        },
    ];

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shadow-inner">
                        <Lock size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] theme-text-primary">Payment Architecture</p>
                        <p className="text-[9px] font-bold theme-text-muted uppercase tracking-widest opacity-60">Secured via end-to-end encryption</p>
                    </div>
                </div>
                <div className="flex items-center gap-2.5 text-emerald-500 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20 shadow-sm">
                    <ShieldCheck size={14} />
                    <span className="text-[10px] font-black uppercase tracking-[0.1em]">SSL Secure</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {paymentMethods.map((method, idx) => {
                    const Icon = method.icon;
                    const isSelected = selectedMethod === method.id;

                    return (
                        <Motion.button
                            key={method.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => method.supported && onSelectMethod(method.id)}
                            className={`${components.analytics.card} !p-8 flex flex-col items-center text-center transition-all duration-500 border-2 rounded-[2.5rem] relative overflow-hidden ${isSelected
                                    ? 'border-indigo-500 bg-indigo-500/[0.03] shadow-2xl shadow-indigo-500/10 scale-105'
                                    : 'theme-border hover:border-indigo-500/30 bg-white dark:bg-white/5'
                                } ${!method.supported ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                            {isSelected && (
                                <Motion.div
                                    layoutId="selected-bg"
                                    className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none"
                                />
                            )}

                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 relative z-10 ${isSelected ? 'bg-indigo-500 text-white shadow-xl shadow-indigo-500/30' : 'bg-gray-100 dark:bg-white/10 theme-text-muted'
                                }`}>
                                <Icon size={32} />
                            </div>

                            <div className="relative z-10">
                                <h4 className="text-lg font-black theme-text-primary tracking-tight">{method.name}</h4>
                                <p className="text-[10px] font-bold theme-text-muted mt-1 uppercase tracking-widest opacity-60">{method.description}</p>
                            </div>

                            {isSelected && (
                                <Motion.div
                                    layoutId="selected-indicator"
                                    className="mt-6 w-2 h-2 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50"
                                />
                            )}
                        </Motion.button>
                    );
                })}
            </div>
        </div>
    );
};

export default PaymentMethodSelector;

