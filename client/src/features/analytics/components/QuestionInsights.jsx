import React, { useMemo, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
    HelpCircle,
    Lightbulb,
    CheckCircle2,
    Target,
    Clock,
    TrendingDown,
    Zap
} from 'lucide-react';
import { typography, cards, layout, cx } from '../../../styles/index'

const difficultyLabel = (score) => {
    if (score >= 70) return { label: 'Hard', color: 'text-red-500 bg-red-500/10 border-red-500/20', icon: '🔴' };
    if (score >= 40) return { label: 'Medium', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', icon: '🟡' };
    return { label: 'Easy', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', icon: '🟢' };
};

const QuestionInsights = ({ stats = [], summary = {} }) => {
    const [selectedId, setSelectedId] = useState(null);
    const hasData = stats.length > 0;

    if (!hasData) {
        return (
            <div className={cx(cards.empty, "py-16 gap-4")}>
                <div className="w-16 h-16 rounded-2xl bg-[var(--qb-primary)]/5 text-[var(--qb-primary)]/40 flex items-center justify-center">
                    <HelpCircle size={32} />
                </div>
                <div className="space-y-1 text-center">
                    <h3 className={typography.h3}>No Intelligence Recorded</h3>
                    <p className={typography.small}>
                        Question-level cognitive data will synchronize once participants begin submitting responses.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Question Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {stats.map((q, i) => {
                    const qqs = q.qqsScore || 100;
                    const isSelected = selectedId === i;
                    const colorClass = qqs >= 80 ? 'bg-emerald-500' : qqs >= 60 ? 'bg-amber-400' : 'bg-red-500';

                    return (
                        <Motion.button
                            key={i}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.03 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedId(isSelected ? null : i)}
                            className={cx(
                                cards.interactive,
                                "text-left transition-all",
                                isSelected && "border-[var(--qb-primary)] shadow-md shadow-[var(--qb-primary)]/10 z-10"
                            )}
                        >
                            <div className={cx(layout.rowBetween, "mb-4")}>
                                <span className={typography.metaLabel}>Question {i + 1}</span>
                                <div className={cx("w-2 h-2 rounded-full", colorClass)} />
                            </div>

                            <h4 className={cx(typography.bodyStrong, "mb-4 line-clamp-2 min-h-[2.5rem]")}>
                                {q.question || `Question ${i + 1}`}
                            </h4>

                            <div className={cx(cards.divider, "grid grid-cols-2 gap-3 pt-3")}>
                                <div>
                                    <p className={typography.micro}>Accuracy</p>
                                    <p className={typography.bodyStrong}>{(q.accuracy || 0).toFixed(1)}%</p>
                                </div>
                                <div>
                                    <p className={typography.micro}>Avg Time</p>
                                    <p className={typography.bodyStrong}>{(q.avgResponseTime || 0).toFixed(1)}s</p>
                                </div>
                            </div>

                            {isSelected && (
                                <div className="absolute inset-0 bg-[var(--qb-primary)]/[0.02] rounded-2xl pointer-events-none" />
                            )}
                        </Motion.button>
                    );
                })}
            </div>

            {/* Detailed View (Expandable) */}
            <AnimatePresence>
                {selectedId !== null && (
                    <Motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className={cx(cards.default, "bg-[var(--qb-primary)]/[0.02] border-[var(--qb-primary)]/10 mt-4 relative overflow-hidden")}>
                            <div className="absolute top-0 right-0 p-8 text-[var(--qb-primary)]/5 rotate-12 pointer-events-none">
                                <Zap size={160} />
                            </div>

                            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
                                {/* Left: Deep Metrics */}
                                <div className="lg:col-span-5 space-y-6">
                                    <div className="space-y-1">
                                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--qb-primary)]/10 text-[var(--qb-primary)] text-[10px] font-bold uppercase tracking-wider mb-2">
                                            Intelligence Detail
                                        </div>
                                        <h3 className={typography.h2}>Question {selectedId + 1} Node</h3>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { label: 'QQS SCORE', val: stats[selectedId].qqsScore || 100, icon: Target },
                                            { label: 'ATTEMPTS', val: stats[selectedId].totalResponses || 0, icon: Users },
                                            { label: 'AVG VELOCITY', val: `${(stats[selectedId].avgResponseTime || 0).toFixed(1)}s`, icon: Clock },
                                            { label: 'DROP-OFF', val: `${(stats[selectedId].dropOffRate || 0).toFixed(1)}%`, icon: TrendingDown },
                                        ].map((m, i) => (
                                            <div key={i} className={cx(cards.flat, "space-y-1")}>
                                                <div className={cx(layout.rowStart, "gap-1.5 mb-1")}>
                                                    <m.icon size={12} className="text-[var(--qb-primary)]" />
                                                    <p className={typography.micro}>{m.label}</p>
                                                </div>
                                                <p className={typography.metricSm}>{m.val}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {stats[selectedId].explanation && (
                                        <div className="p-4 rounded-xl bg-amber-50 text-amber-900 dark:bg-amber-900/10 dark:text-amber-200 border border-amber-200 dark:border-amber-800/30 space-y-1.5">
                                            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500">
                                                <Lightbulb size={14} />
                                                <span className={typography.micro}>Cognitive Explanation</span>
                                            </div>
                                            <p className={cx(typography.small, "italic")}>
                                                "{stats[selectedId].explanation}"
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Right: Answer Distribution */}
                                <div className="lg:col-span-7 space-y-4">
                                    <p className={typography.metaLabel}>Distribution Matrix</p>
                                    <div className="space-y-2">
                                        {stats[selectedId].optionDistribution?.map((opt, i) => {
                                            const optPct = stats[selectedId].totalResponses > 0 ? (opt.count / stats[selectedId].totalResponses) * 100 : 0;
                                            return (
                                                <div key={i} className="group relative">
                                                    <div className={cx(
                                                        "flex items-center justify-between p-4 rounded-xl border transition-all overflow-hidden",
                                                        opt.isCorrect
                                                            ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800/50"
                                                            : "theme-surface theme-border"
                                                    )}>
                                                        <div
                                                            className={cx(
                                                                "absolute inset-y-0 left-0 transition-all duration-1000",
                                                                opt.isCorrect ? "bg-emerald-500/10" : "bg-[var(--qb-primary)]/5"
                                                            )}
                                                            style={{ width: `${optPct}%` }}
                                                        />
                                                        <div className="relative z-10 flex items-center gap-3 flex-1">
                                                            <span className={cx(
                                                                "w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold transition-colors shrink-0",
                                                                opt.isCorrect ? "bg-emerald-500 text-white" : "theme-surface-soft theme-text-muted"
                                                            )}>
                                                                {String.fromCharCode(65 + i)}
                                                            </span>
                                                            <span className={typography.bodyStrong}>{opt.option}</span>
                                                        </div>
                                                        <div className="relative z-10 flex items-center gap-3 shrink-0">
                                                            <span className={typography.bodyStrong}>{optPct.toFixed(1)}%</span>
                                                            {opt.isCorrect && <CheckCircle2 size={16} className="text-emerald-500" />}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default QuestionInsights;
