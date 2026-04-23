import React from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { X, Layout, Layers, Globe, Lock, ShieldCheck, Zap, Sparkles, ChevronRight } from 'lucide-react';
import { textStyles, panelStyles, formStyles, components, cards, typography, buttonStyles, forms, cx } from '../../../styles/index';

const CreateTemplatePanel = ({
    showCreate,
    accessType,
    onAccessTypeChange,
    newQuizTitle,
    onTitleChange,
    onCreate,
    subscriptionEntitlements,
    quizType = 'quiz',
    onQuizTypeChange,
}) => {
    return (
        <AnimatePresence>
            {showCreate && (
                <Motion.div
                    initial={{ opacity: 0, y: -40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="overflow-hidden mb-16"
                >
                    <div className={cx(
                        cards.base,
                        "!p-8 md:!p-12 !rounded-[2rem] md:!rounded-[3rem] border-2 border-indigo-500/30 shadow-xl shadow-indigo-500/5 relative overflow-hidden bg-white dark:bg-gray-900"
                    )}>
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl pointer-events-none" />

                        <div className="relative space-y-10 md:space-y-12">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                                        <Sparkles size={28} />
                                    </div>
                                    <div>
                                        <h2 className={typography.h2}>Establish New Node</h2>
                                        <p className={cx(typography.body, "theme-text-muted mt-1")}>Configure your session logic and deployment parameters.</p>
                                    </div>
                                </div>
                                <div className="flex items-center self-start md:self-auto gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                                    <Zap size={14} className="text-indigo-600 dark:text-indigo-400" />
                                    <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">Pipeline Active</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <label className={typography.eyebrow}>
                                        Template Identifier
                                    </label>
                                    <span className={cx(typography.micro, "text-indigo-500/60")}>Required Field</span>
                                </div>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        placeholder={quizType === 'quiz' ? "e.g. Q4 Enterprise Compliance Assessment" : "e.g. Engineering Onboarding Templates"}
                                        value={newQuizTitle}
                                        onChange={(e) => onTitleChange(e.target.value)}
                                        className={cx(forms.inputField, "pr-12 bg-gray-50/50 dark:bg-white/5 border-2 hover:border-indigo-500/30 transition-colors")}
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500 opacity-0 group-focus-within:opacity-100 transition-opacity">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                                <p className={cx(typography.metaLabel, "px-2")}>This title will be visible to all participants during session synchronization.</p>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <label className={cx(typography.eyebrow, "px-1")}>
                                        Node Structure
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => onQuizTypeChange?.('quiz')}
                                            className={cx(
                                                "group relative flex flex-col items-start p-6 rounded-[2rem] border-2 transition-all duration-300 text-left",
                                                quizType === 'quiz' 
                                                ? "border-indigo-500 bg-indigo-500/5 shadow-lg shadow-indigo-500/10 scale-[1.02]" 
                                                : "theme-border hover:border-indigo-500/20 bg-gray-50/50 dark:bg-white/5"
                                            )}
                                        >
                                            <div className={cx(
                                                "w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 shadow-inner",
                                                quizType === 'quiz' ? "bg-indigo-500 text-white" : "bg-white dark:bg-white/10 theme-text-muted"
                                            )}>
                                                <Layout size={20} />
                                            </div>
                                            <span className={cx(typography.cardTitle, "mb-1")}>Single Blitz</span>
                                            <span className={typography.metaLabel}>Create a standalone template.</span>
                                            {quizType === 'quiz' && (
                                                <Motion.div layoutId="type-check" className="absolute top-5 right-5 w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/40" />
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => onQuizTypeChange?.('subject')}
                                            className={cx(
                                                "group relative flex flex-col items-start p-6 rounded-[2rem] border-2 transition-all duration-300 text-left",
                                                quizType === 'subject' 
                                                ? "border-indigo-500 bg-indigo-500/5 shadow-lg shadow-indigo-500/10 scale-[1.02]" 
                                                : "theme-border hover:border-indigo-500/20 bg-gray-50/50 dark:bg-white/5"
                                            )}
                                        >
                                            <div className={cx(
                                                "w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 shadow-inner",
                                                quizType === 'subject' ? "bg-indigo-500 text-white" : "bg-white dark:bg-white/10 theme-text-muted"
                                            )}>
                                                <Layers size={20} />
                                            </div>
                                            <span className={cx(typography.cardTitle, "mb-1")}>Multi Blitz</span>
                                            <span className={typography.metaLabel}>Create a folder for grouping templates.</span>
                                            {quizType === 'subject' && (
                                                <Motion.div layoutId="type-check" className="absolute top-5 right-5 w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/40" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className={cx(typography.eyebrow, "px-1")}>
                                        Privacy Infrastructure
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => onAccessTypeChange('public')}
                                            className={cx(
                                                "group relative flex flex-col items-start p-6 rounded-[2rem] border-2 transition-all duration-300 text-left",
                                                accessType === 'public' 
                                                ? "border-indigo-500 bg-indigo-500/5 shadow-lg shadow-indigo-500/10 scale-[1.02]" 
                                                : "theme-border hover:border-indigo-500/20 bg-gray-50/50 dark:bg-white/5"
                                            )}
                                        >
                                            <div className={cx(
                                                "w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 shadow-inner",
                                                accessType === 'public' ? "bg-indigo-500 text-white" : "bg-white dark:bg-white/10 theme-text-muted"
                                            )}>
                                                <Globe size={20} />
                                            </div>
                                            <span className={cx(typography.cardTitle, "mb-1")}>Public Node</span>
                                            <span className={typography.metaLabel}>Discoverable on the global marketplace.</span>
                                            {accessType === 'public' && (
                                                <Motion.div layoutId="access-check" className="absolute top-5 right-5 w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/40" />
                                            )}
                                        </button>

                                        <div className="relative group/lock">
                                            <button
                                                type="button"
                                                disabled={!subscriptionEntitlements.canUsePrivateHosting}
                                                onClick={() => onAccessTypeChange('private')}
                                                className={cx(
                                                    "w-full text-left group relative flex flex-col items-start p-6 rounded-[2rem] border-2 transition-all duration-300",
                                                    accessType === 'private' 
                                                    ? "border-indigo-500 bg-indigo-500/5 shadow-lg shadow-indigo-500/10 scale-[1.02]" 
                                                    : "theme-border hover:border-indigo-500/20 bg-gray-50/50 dark:bg-white/5",
                                                    !subscriptionEntitlements.canUsePrivateHosting ? "opacity-40 grayscale cursor-not-allowed" : ""
                                                )}
                                            >
                                                <div className={cx(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 shadow-inner",
                                                    accessType === 'private' ? "bg-indigo-500 text-white" : "bg-white dark:bg-white/10 theme-text-muted"
                                                )}>
                                                    {subscriptionEntitlements.canUsePrivateHosting ? <Lock size={20} /> : <ShieldCheck size={20} />}
                                                </div>
                                                <span className={cx(typography.cardTitle, "mb-1")}>Private Node</span>
                                                <span className={typography.metaLabel}>Exclusive encrypted access via link.</span>
                                                {accessType === 'private' && (
                                                    <Motion.div layoutId="access-check" className="absolute top-5 right-5 w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/40" />
                                                )}
                                            </button>
                                            {!subscriptionEntitlements.canUsePrivateHosting && (
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/lock:opacity-100 transition-opacity bg-white/90 dark:bg-gray-900/90 rounded-[2rem] pointer-events-none p-6 text-center">
                                                    <span className={typography.eyebrow}>Upgrade to Creator Plan to Unlock Private Hosting</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-10 border-t-2 theme-border flex flex-col md:flex-row md:items-center justify-between gap-8">
                                <div className="flex items-center gap-4 max-w-lg">
                                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-inner">
                                        <ShieldCheck size={24} />
                                    </div>
                                    <p className={typography.body}>
                                        {accessType === 'private' 
                                            ? 'Private hosting enforces strict identity verification and encrypted telemetry logs for your session.' 
                                            : 'Public templates leverage Quvolt’s global edge distribution to reach thousands of learners instantly.'}
                                    </p>
                                </div>
                                <button
                                    onClick={onCreate}
                                    className={cx(
                                        buttonStyles.base,
                                        buttonStyles.primary,
                                        "w-full md:w-auto flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                                    )}
                                >
                                    <Zap size={18} fill="currentColor" />
                                    <span>Deploy Template Node</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </Motion.div>
            )}
        </AnimatePresence>
    );
};

export default CreateTemplatePanel;
