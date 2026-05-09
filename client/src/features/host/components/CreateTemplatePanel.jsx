import React from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { X, Layout, Layers, Globe, Lock, ShieldCheck, Zap, Sparkles, ChevronRight, User } from 'lucide-react';
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
    quizMode = 'auto',
    onQuizModeChange,
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
                                        <h2 className={typography.h2}>Create New Content</h2>
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
                                        Quiz Title
                                    </label>
                                    <span className={cx(typography.micro, "text-indigo-500/60")}>Required Field</span>
                                </div>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        placeholder={quizType === 'quiz' ? "e.g. Q4 Enterprise Compliance Assessment" : "e.g. Engineering Onboarding Templates"}
                                        value={newQuizTitle}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const capitalized = val.charAt(0).toUpperCase() + val.slice(1);
                                            onTitleChange(capitalized);
                                        }}
                                        className={cx(forms.inputField, "pr-12 bg-gray-50/50 dark:bg-white/5 border-2 hover:border-indigo-500/30 transition-colors")}
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500 opacity-0 group-focus-within:opacity-100 transition-opacity">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                                <p className={cx(typography.metaLabel, "px-2")}>This title will be visible to all participants during session synchronization.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                                {/* ── Structure Section ─────────────────────────── */}
                                <div className="space-y-4">
                                    <label className={cx(typography.eyebrow, "px-1")}>
                                        Content Type
                                    </label>
                                    <div className="grid grid-cols-1 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => onQuizTypeChange?.('template')}
                                            className={cx(
                                                "group relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 text-left",
                                                quizType === 'template' 
                                                ? "border-indigo-500 bg-indigo-500/5 shadow-md scale-[1.02]" 
                                                : "theme-border hover:border-indigo-500/20 bg-gray-50/50 dark:bg-white/5"
                                            )}
                                        >
                                            <div className={cx(
                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-inner shrink-0",
                                                quizType === 'template' ? "bg-indigo-500 text-white" : "bg-white dark:bg-white/10 theme-text-muted"
                                            )}>
                                                <Layout size={18} />
                                            </div>
                                            <div>
                                                <p className={cx(typography.cardTitle, "text-sm mb-0.5")}>Single Quiz</p>
                                                <p className="text-[10px] opacity-60 font-medium uppercase tracking-wider">Individual Quiz</p>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => onQuizTypeChange?.('subject')}
                                            className={cx(
                                                "group relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 text-left",
                                                quizType === 'subject' 
                                                ? "border-indigo-500 bg-indigo-500/5 shadow-md scale-[1.02]" 
                                                : "theme-border hover:border-indigo-500/20 bg-gray-50/50 dark:bg-white/5"
                                            )}
                                        >
                                            <div className={cx(
                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-inner shrink-0",
                                                quizType === 'subject' ? "bg-indigo-500 text-white" : "bg-white dark:bg-white/10 theme-text-muted"
                                            )}>
                                                <Layers size={18} />
                                            </div>
                                            <div>
                                                <p className={cx(typography.cardTitle, "text-sm mb-0.5")}>Collection</p>
                                                <p className="text-[10px] opacity-60 font-medium uppercase tracking-wider">Grouped Content</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* ── Engine Mode Section ───────────────────────── */}
                                <div className="space-y-4">
                                    <label className={cx(typography.eyebrow, "px-1")}>
                                        Session Engine
                                    </label>
                                    <div className="grid grid-cols-1 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => onQuizModeChange?.('auto')}
                                            className={cx(
                                                "group relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 text-left",
                                                quizMode === 'auto' 
                                                ? "border-indigo-500 bg-indigo-500/5 shadow-md scale-[1.02]" 
                                                : "theme-border hover:border-indigo-500/20 bg-gray-50/50 dark:bg-white/5"
                                            )}
                                        >
                                            <div className={cx(
                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-inner shrink-0",
                                                quizMode === 'auto' ? "bg-indigo-500 text-white" : "bg-white dark:bg-white/10 theme-text-muted"
                                            )}>
                                                <Zap size={18} />
                                            </div>
                                            <div>
                                                <p className={cx(typography.cardTitle, "text-sm mb-0.5")}>Auto-Sync</p>
                                                <p className="text-[10px] opacity-60 font-medium uppercase tracking-wider">Automated Logic</p>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => onQuizModeChange?.('tutor')}
                                            className={cx(
                                                "group relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 text-left",
                                                quizMode === 'tutor' 
                                                ? "border-indigo-500 bg-indigo-500/5 shadow-md scale-[1.02]" 
                                                : "theme-border hover:border-indigo-500/20 bg-gray-50/50 dark:bg-white/5"
                                            )}
                                        >
                                            <div className={cx(
                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-inner shrink-0",
                                                quizMode === 'tutor' ? "bg-indigo-500 text-white" : "bg-white dark:bg-white/10 theme-text-muted"
                                            )}>
                                                <User size={18} />
                                            </div>
                                            <div>
                                                <p className={cx(typography.cardTitle, "text-sm mb-0.5")}>Tutor-Led</p>
                                                <p className="text-[10px] opacity-60 font-medium uppercase tracking-wider">Host Control</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* ── Privacy Section ───────────────────────────── */}
                                <div className="space-y-4">
                                    <label className={cx(typography.eyebrow, "px-1")}>
                                        Privacy Infrastructure
                                    </label>
                                    <div className="grid grid-cols-1 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => onAccessTypeChange('public')}
                                            className={cx(
                                                "group relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 text-left",
                                                accessType === 'public' 
                                                ? "border-indigo-500 bg-indigo-500/5 shadow-md scale-[1.02]" 
                                                : "theme-border hover:border-indigo-500/20 bg-gray-50/50 dark:bg-white/5"
                                            )}
                                        >
                                            <div className={cx(
                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-inner shrink-0",
                                                accessType === 'public' ? "bg-indigo-500 text-white" : "bg-white dark:bg-white/10 theme-text-muted"
                                            )}>
                                                <Globe size={18} />
                                            </div>
                                            <div>
                                                <p className={cx(typography.cardTitle, "text-sm mb-0.5")}>Public Node</p>
                                                <p className="text-[10px] opacity-60 font-medium uppercase tracking-wider">Global Discovery</p>
                                            </div>
                                        </button>

                                        <div className="relative group/lock">
                                            <button
                                                type="button"
                                                disabled={!subscriptionEntitlements.canUsePrivateHosting}
                                                onClick={() => onAccessTypeChange('private')}
                                                className={cx(
                                                    "w-full group relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 text-left",
                                                    accessType === 'private' 
                                                    ? "border-indigo-500 bg-indigo-500/5 shadow-md scale-[1.02]" 
                                                    : "theme-border hover:border-indigo-500/20 bg-gray-50/50 dark:bg-white/5",
                                                    !subscriptionEntitlements.canUsePrivateHosting ? "opacity-40 grayscale cursor-not-allowed" : ""
                                                )}
                                            >
                                                <div className={cx(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-inner shrink-0",
                                                    accessType === 'private' ? "bg-indigo-500 text-white" : "bg-white dark:bg-white/10 theme-text-muted"
                                                )}>
                                                    <Lock size={18} />
                                                </div>
                                                <div>
                                                    <p className={cx(typography.cardTitle, "text-sm mb-0.5")}>Private Node</p>
                                                    <p className="text-[10px] opacity-60 font-medium uppercase tracking-wider">Encrypted Link</p>
                                                </div>
                                            </button>
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
                                        {quizMode === 'tutor' 
                                            ? 'Tutor mode grants you full manual control over the question sequence and participation flow.' 
                                            : 'Auto mode enables automated question advancement and real-time self-paced synchronization.'}
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
                                    <span>Initialize Content</span>
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
