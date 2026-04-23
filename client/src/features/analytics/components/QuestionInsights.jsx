import React, { useMemo } from 'react';
import { TrendingDown, Zap, HelpCircle, AlertTriangle, Lightbulb, CheckCircle2, Clock, Activity, Target } from 'lucide-react';

const difficultyLabel = (score) => {
    if (score >= 70) return { label: 'Hard', color: 'text-red-500 bg-red-500/10 border-red-500/20', icon: '🔴' };
    if (score >= 40) return { label: 'Medium', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', icon: '🟡' };
    return { label: 'Easy', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', icon: '🟢' };
};

const getSpeedBadge = (time) => {
    if (time < 5) return { text: "Fast ⚡", color: "text-emerald-500 bg-emerald-500/10" };
    if (time > 15) return { text: "Slow 🐢", color: "text-red-500 bg-red-500/10" };
    return { text: "Avg ⏱️", color: "text-amber-500 bg-amber-500/10" };
};

const getStructuredInsight = (q) => {
    if (q.accuracy < 30) return { title: "Extremely Difficult", severity: "HIGH", color: "text-red-500", bg: "bg-red-500/10 border-red-500/20", text: "Accuracy is critically low. Consider simplifying the wording or adding a hint." };
    if (q.dropOffRate > 20) return { title: "Abandonment Risk", severity: "HIGH", color: "text-red-500", bg: "bg-red-500/10 border-red-500/20", text: "Users are abandoning the session here. Verify that the question isn't broken." };
    if (q.avgResponseTime > 15) return { title: "Confusing Options", severity: "MEDIUM", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", text: "Users are taking unusually long. Distractor options might be too similar." };
    if (q.accuracy > 90) return { title: "Poor Differentiation", severity: "LOW", color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20", text: "Extremely easy. Might not effectively test knowledge differentiation." };
    return { title: "Optimal Performance", severity: "NONE", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", text: "Well-performing question with a good balance of difficulty and engagement." };
};

const getQqsBadge = (score) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    if (score >= 60) return { label: 'Fair', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    return { label: 'Critical', color: 'text-red-600 bg-red-50 border-red-200' };
};

const QuestionInsightCard = ({ q, index, sessionAvgAccuracy }) => {
    const diff = difficultyLabel(q.difficulty || 0);
    const speed = getSpeedBadge(q.avgResponseTime || 0);
    const accuracyDiff = (q.accuracy || 0) - sessionAvgAccuracy;
    const insight = getStructuredInsight(q);
    const qqs = getQqsBadge(q.qqsScore || 100);
    
    return (
        <div className="theme-surface border theme-border rounded-3xl p-6 space-y-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-black theme-text-secondary">Q{index + 1}</span>
                        
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${qqs.color} text-[10px] font-bold uppercase tracking-wider`}>
                            <Target size={12} />
                            QQS: {q.qqsScore || 100}
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${diff.color}`}>
                            {diff.label} {diff.icon}
                        </span>
                        
                    </div>
                    <h4 className="text-base font-bold theme-text-primary leading-snug">
                        {q.question || `Question ${index + 1}`}
                    </h4>
                </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y theme-border">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest theme-text-muted">Accuracy</p>
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-black theme-text-primary">{(q.accuracy || 0).toFixed(1)}%</span>
                        <span className={`text-[10px] font-bold ${accuracyDiff >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {accuracyDiff > 0 ? '+' : ''}{accuracyDiff.toFixed(1)}% {accuracyDiff >= 0 ? '↑' : '↓'}
                        </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-[var(--qb-primary)] rounded-full" style={{ width: `${Math.min(q.accuracy || 0, 100)}%` }} />
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest theme-text-muted">Attempts</p>
                    <p className="text-lg font-black theme-text-primary">{q.totalResponses || 0}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest theme-text-muted">Avg Time</p>
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-black theme-text-primary">{(q.avgResponseTime || 0).toFixed(1)}s</span>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${speed.color}`}>
                            {speed.text}
                        </span>
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest theme-text-muted">Drop-off</p>
                    <p className={`text-lg font-black ${q.dropOffRate > 20 ? 'text-red-500' : 'theme-text-primary'}`}>
                        {(q.dropOffRate || 0).toFixed(1)}%
                    </p>
                </div>
            </div>

            {/* Answer Distribution */}
            {q.optionDistribution && q.optionDistribution.length > 0 && (
                <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest theme-text-muted">Answer Distribution</p>
                    <div className="space-y-2">
                        {q.optionDistribution.map((opt, i) => {
                            const optPct = q.totalResponses > 0 ? (opt.count / q.totalResponses) * 100 : 0;
                            return (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="w-6 font-mono text-xs font-bold theme-text-secondary">{String.fromCharCode(65 + i)}</span>
                                    <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden relative">
                                        <div 
                                            className={`absolute left-0 top-0 bottom-0 ${opt.isCorrect ? 'bg-emerald-500/80' : 'bg-[var(--qb-primary)]/40'}`} 
                                            style={{ width: `${Math.max(optPct, 2)}%` }} 
                                        />
                                        <div className="absolute inset-0 px-2 flex items-center justify-between text-[10px] font-bold theme-text-primary z-10 mix-blend-difference">
                                            <span className="truncate max-w-[80%] text-white">{opt.option}</span>
                                        </div>
                                    </div>
                                    <span className="w-12 text-right text-xs font-bold theme-text-secondary">{optPct.toFixed(1)}%</span>
                                    <span className="w-4 text-emerald-500">{opt.isCorrect && <CheckCircle2 size={14} />}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Structured AI Insight */}
            <div className={`rounded-2xl p-4 border flex items-start gap-3 ${insight.bg}`}>
                {insight.severity === 'HIGH' ? (
                    <AlertTriangle size={18} className={`shrink-0 mt-0.5 ${insight.color}`} />
                ) : (
                    <Lightbulb size={18} className={`shrink-0 mt-0.5 ${insight.color}`} />
                )}
                <div className="space-y-1">
                    <p className={`text-xs font-bold uppercase tracking-wider ${insight.color}`}>
                        {insight.severity !== 'NONE' && '⚠️ '} {insight.title}
                    </p>
                    <p className="text-sm font-medium theme-text-secondary leading-relaxed">
                        {insight.text}
                    </p>
                </div>
            </div>
        </div>
    );
};

const QuestionInsights = ({ stats = [], summary = {} }) => {
    const hasData = stats.length > 0;

    const sessionAvgAccuracy = useMemo(() => {
        if (!hasData) return 0;
        return stats.reduce((acc, q) => acc + (q.accuracy || 0), 0) / stats.length;
    }, [stats, hasData]);

    const priorityFixes = useMemo(() => {
        // Sort by QQS ascending, filter out good scores
        return [...stats]
            .map((q, originalIndex) => ({ ...q, originalIndex }))
            .sort((a, b) => (a.qqsScore || 0) - (b.qqsScore || 0))
            .filter(q => (q.qqsScore || 0) < 60)
            .slice(0, 3); // Top 3 worst questions
    }, [stats]);

    if (!hasData) {
        return (
            <div className="theme-surface border theme-border rounded-4xl p-12 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                    <HelpCircle size={32} />
                </div>
                <div>
                    <h3 className="text-base font-bold theme-text-primary">No Question Insights Yet</h3>
                    <p className="text-sm theme-text-muted mt-1 max-w-sm mx-auto">
                        Intelligence will be generated once participants answer questions.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            
            <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6">
                {/* Priority Fix Order Panel */}
                <div className="bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-3xl p-6 flex flex-col space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl">
                            <AlertTriangle size={20} />
                        </div>
                        <h3 className="text-base font-bold text-red-900 dark:text-red-400">Priority Fix Order</h3>
                    </div>
                    {priorityFixes.length > 0 ? (
                        <div className="space-y-3">
                            {priorityFixes.map((q, i) => (
                                <div key={i} className="flex items-center justify-between bg-white dark:bg-black/20 border border-red-100 dark:border-red-500/10 p-3 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 text-[10px] font-bold">
                                            {i + 1}
                                        </span>
                                        <span className="text-sm font-semibold theme-text-primary">Q{q.originalIndex + 1}</span>
                                    </div>
                                    <span className="text-xs font-bold text-red-600 px-2 py-1 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-100 dark:border-red-500/20">
                                        Score: {q.qqsScore || 0}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                            <CheckCircle2 size={16} /> No critical fixes needed.
                        </div>
                    )}
                </div>

                {/* Heatmap View */}
                <div className="theme-surface border theme-border rounded-3xl p-6 flex flex-col space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <Activity size={20} />
                        </div>
                        <h3 className="text-base font-bold theme-text-primary">QQS Heatmap</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {stats.map((q, i) => {
                            const score = q.qqsScore || 0;
                            const bg = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-400' : 'bg-red-500';
                            return (
                                <div 
                                    key={i} 
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-sm ${bg} hover:scale-110 transition-transform cursor-default`}
                                    title={`Q${i + 1} - Score: ${score}`}
                                >
                                    {i + 1}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* List of Insight Cards */}
            <div className="space-y-6">
                {stats.map((q, idx) => (
                    <QuestionInsightCard 
                        key={q.questionId || idx} 
                        q={q} 
                        index={idx} 
                        sessionAvgAccuracy={sessionAvgAccuracy} 
                    />
                ))}
            </div>
        </div>
    );
};

export default QuestionInsights;
