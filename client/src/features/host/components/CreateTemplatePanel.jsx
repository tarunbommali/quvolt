import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layout, Globe, Lock, ShieldCheck, Zap } from 'lucide-react';

const CreateTemplatePanel = ({
    showCreate,
    quizType,
    onQuizTypeChange,
    accessType,
    onAccessTypeChange,
    newQuizTitle,
    onTitleChange,
    onCreate,
    isPaid,
    onPaidToggle,
    quizPrice,
    onPriceChange,
    subscriptionEntitlements
}) => {
    return (
        <AnimatePresence>
            {showCreate && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-8"
                >
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl shadow-slate-200/50">
                        <div className="flex flex-col gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Template Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Modern Physics Final Assessment"
                                        value={newQuizTitle}
                                        onChange={(e) => onTitleChange(e.target.value)}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Privacy Setting</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => onAccessTypeChange('public')}
                                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${accessType === 'public' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
                                            >
                                                <Globe size={18} />
                                                <span className="font-bold text-sm">Public</span>
                                            </button>
                                            <div className="relative group/lock">
                                                <button
                                                    type="button"
                                                    disabled={!subscriptionEntitlements.canUsePrivateHosting}
                                                    onClick={() => onAccessTypeChange('private')}
                                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${accessType === 'private' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 hover:border-slate-300 text-slate-600'} ${!subscriptionEntitlements.canUsePrivateHosting ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                                                >
                                                    {subscriptionEntitlements.canUsePrivateHosting ? <Lock size={18} /> : <ShieldCheck size={18} className="text-amber-500" />}
                                                    <span className="font-bold text-sm">Private</span>
                                                </button>
                                                {!subscriptionEntitlements.canUsePrivateHosting && (
                                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover/lock:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                                        Upgrade for Private Hosting 🚀
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                                <p className="text-xs text-slate-400 font-medium">
                                    {accessType === 'private' ? 'Only people with the join link can see this template.' : 'This template will be searchable on the Quvolt Marketplace.'}
                                </p>
                                <button
                                    onClick={onCreate}
                                    className="w-full md:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-indigo-600/30 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Zap size={18} fill="currentColor" />
                                    Create Template
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CreateTemplatePanel;

