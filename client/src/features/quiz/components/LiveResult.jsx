import { useEffect, useState } from 'react';
import { Trophy, BarChart2, Users, CheckCircle2, XCircle, Loader2, ArrowRight, Layout, Activity } from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import api from '../services/quiz.service';
import { typography, layout, buttonStyles, cards, cx } from '../../../styles/index';

const optionColors = [
    { bg: 'bg-blue-500/10', bar: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500/20' },
    { bg: 'bg-purple-500/10', bar: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-500/20' },
    { bg: 'bg-amber-500/10', bar: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500/20' },
    { bg: 'bg-rose-500/10', bar: 'bg-rose-500', text: 'text-rose-500', border: 'border-rose-500/20' },
];

const LiveResult = ({ activeQuiz, leaderboard, navigate, sessionCode }) => {
    const topThree = leaderboard.slice(0, 3);
    const others = leaderboard.slice(3, 10); // top 10 only

    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' | 'stats'

    useEffect(() => {
        const code = sessionCode || activeQuiz?.roomCode;
        if (!code) return;

        let cancelled = false;
        api.get(`/quiz/session/${code}/results`)
            .then((r) => {
                if (!cancelled) setStats(r.data);
            })
            .catch(() => {
                if (!cancelled) setStats(null);
            })
            .finally(() => {
                if (!cancelled) setLoadingStats(false);
            });

        return () => {
            cancelled = true;
        };
    }, [sessionCode, activeQuiz]);

    return (
        <div className={cx(layout.page, "max-w-6xl space-y-12 animate-in fade-in zoom-in duration-700 pb-20")}>
            {/* Header Area */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className={typography.micro}>Global Sequence Finalized</span>
                </div>
                <h1 className={typography.metricLg}>Grand Standings</h1>
                <p className={cx(typography.bodyStrong, "opacity-60")}>
                    {activeQuiz?.title} • ID: {sessionCode || activeQuiz?.roomCode}
                </p>
            </div>

            {/* Podium Visualization */}
            <div className="grid grid-cols-3 gap-6 items-end pt-10 pb-16 px-4">
                {/* 2nd Place */}
                <div className={cx(cards.base, "h-64 !rounded-[3rem] p-8 flex flex-col items-center justify-end relative shadow-xl shadow-slate-500/5 group")}>
                    <div className="absolute -top-10 w-20 h-20 rounded-full bg-white dark:bg-gray-800 border-4 border-slate-200 text-slate-400 font-black text-2xl flex items-center justify-center shadow-lg">2</div>
                    <p className={cx(typography.bodyStrong, "truncate w-full text-center")}>{topThree[1]?.name || '—'}</p>
                    <p className={cx(typography.metricSm, "text-slate-400")}>{topThree[1]?.score?.toLocaleString() || 0}</p>
                </div>

                {/* 1st Place */}
                <div className={cx(cards.elevated, "h-80 !rounded-[3.5rem] border-2 border-amber-500/20 p-10 flex flex-col items-center justify-end relative shadow-2xl shadow-amber-500/10 z-10 group")}>
                    <div className="absolute -top-16 w-32 h-32 flex items-center justify-center">
                        <Trophy className="text-amber-500 drop-shadow-2xl" size={80} fill="currentColor" />
                    </div>
                    <div className="absolute -top-6 w-16 h-16 rounded-full bg-white dark:bg-gray-800 border-4 border-amber-500 text-amber-500 font-black text-3xl flex items-center justify-center shadow-lg">1</div>
                    <p className={cx(typography.h3, "truncate w-full text-center")}>{topThree[0]?.name || '—'}</p>
                    <p className={cx(typography.metricMd, "text-amber-500")}>{topThree[0]?.score?.toLocaleString() || 0}</p>
                    <div className={cx(typography.micro, "mt-4 px-4 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20")}>Supreme Victor</div>
                </div>

                {/* 3rd Place */}
                <div className={cx(cards.base, "h-52 !rounded-[3rem] p-8 flex flex-col items-center justify-end relative shadow-xl shadow-amber-700/5 group")}>
                    <div className="absolute -top-10 w-20 h-20 rounded-full bg-white dark:bg-gray-800 border-4 border-amber-700/30 text-amber-700/50 font-black text-2xl flex items-center justify-center shadow-lg">3</div>
                    <p className={cx(typography.bodyStrong, "truncate w-full text-center")}>{topThree[2]?.name || '—'}</p>
                    <p className={cx(typography.metricSm, "text-amber-700/50")}>{topThree[2]?.score?.toLocaleString() || 0}</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex justify-center">
                <div className="flex gap-2 bg-gray-100 dark:bg-white/5 rounded-2xl p-1.5 border theme-border">
                    <button
                        onClick={() => setActiveTab('leaderboard')}
                        className={cx(
                            "px-8 py-3 rounded-xl transition-all flex items-center gap-3",
                            typography.micro,
                            activeTab === 'leaderboard' 
                            ? 'bg-white dark:bg-white/10 text-indigo-500 shadow-lg' 
                            : 'theme-text-muted hover:theme-text-primary'
                        )}
                    >
                        <Users size={16} /> Leaderboard
                    </button>
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={cx(
                            "px-8 py-3 rounded-xl transition-all flex items-center gap-3",
                            typography.micro,
                            activeTab === 'stats' 
                            ? 'bg-white dark:bg-white/10 text-indigo-500 shadow-lg' 
                            : 'theme-text-muted hover:theme-text-primary'
                        )}
                    >
                        <BarChart2 size={16} /> Question Intel
                    </button>
                </div>
            </div>

            {/* Content Switcher */}
            <AnimatePresence mode="wait">
                {activeTab === 'leaderboard' ? (
                    <Motion.div 
                        key="leaderboard"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={cx(cards.base, "!p-0 !rounded-[3rem] overflow-hidden border theme-border shadow-2xl shadow-indigo-500/5")}
                    >
                        <div className="p-8 border-b theme-border flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <Layout size={20} className="text-indigo-500" />
                                <h3 className={typography.h3}>Full Sequence Ranking</h3>
                            </div>
                            <span className={cx(typography.micro, "px-4 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20")}>
                                {leaderboard.length} Contributors
                            </span>
                        </div>
                        <div className="divide-y theme-border">
                            {[...topThree, ...others].map((p, i) => (
                                <div key={p.name || i} className="flex justify-between items-center px-10 py-6 hover:bg-gray-50 dark:hover:bg-white/5 transition-all group">
                                    <div className="flex items-center gap-6">
                                        <span className={cx(
                                            "text-xl font-black w-10",
                                            i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'theme-text-muted opacity-40'
                                        )}>#{i + 1}</span>
                                        <span className={cx(typography.bodyStrong, "group-hover:translate-x-1 transition-transform")}>{p.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className={cx(typography.metricSm, "text-indigo-500")}>{p.score?.toLocaleString()}</span>
                                        <p className={typography.micro}>Intelligence</p>
                                    </div>
                                </div>
                            ))}
                            {leaderboard.length === 0 && (
                                <div className="py-24 text-center space-y-4">
                                    <Activity size={40} className="mx-auto text-slate-300 opacity-20" />
                                    <p className={typography.micro}>No connection logs available</p>
                                </div>
                            )}
                        </div>
                    </Motion.div>
                ) : (
                    <Motion.div 
                        key="stats"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-8"
                    >
                        {loadingStats ? (
                            <div className="col-span-full py-32 flex flex-col items-center gap-4">
                                <Loader2 size={40} className="text-indigo-500 animate-spin" />
                                <p className={cx(typography.micro, "animate-pulse")}>Aggregating Global Metrics...</p>
                            </div>
                        ) : !stats ? (
                            <div className="col-span-full bg-white dark:bg-white/5 rounded-[3rem] border theme-border p-20 text-center space-y-4">
                                <Activity size={40} className="mx-auto text-slate-300" />
                                <p className={typography.micro}>Intel Feed Unavailable</p>
                            </div>
                        ) : (
                            stats.questionStats?.map((q, qi) => (
                                <div key={q.questionId || qi} className={cx(cards.base, "!p-8 !rounded-[2.5rem] space-y-8 hover:border-indigo-500/20 transition-all shadow-xl shadow-indigo-500/5")}>
                                    <div className="flex items-start justify-between gap-6">
                                        <div className="space-y-1">
                                            <span className={typography.micro + " !text-indigo-500"}>Module Q{qi + 1}</span>
                                            <h4 className={typography.h4}>{q.text}</h4>
                                        </div>
                                        <div className="text-right">
                                            <p className={typography.metricSm}>{q.totalAnswered}</p>
                                            <p className={typography.micro}>Responded</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {q.options.map((opt, oi) => {
                                            const colors = optionColors[oi % optionColors.length];
                                            return (
                                                <div key={oi} className={`rounded-2xl border-2 p-5 space-y-3 transition-all ${
                                                    opt.isCorrect 
                                                    ? 'bg-emerald-500/5 border-emerald-500/30' 
                                                    : `${colors.bg} ${colors.border}`
                                                }`}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            {opt.isCorrect 
                                                                ? <CheckCircle2 size={18} className="text-emerald-500" />
                                                                : <XCircle size={18} className={colors.text + " opacity-60"} />
                                                            }
                                                            <span className={cx(typography.bodyStrong, opt.isCorrect ? 'text-emerald-600' : colors.text)}>
                                                                {opt.option}
                                                            </span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={cx(typography.metricSm, opt.isCorrect ? 'text-emerald-500' : colors.text)}>
                                                                {opt.percentage}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="h-2 bg-white/40 dark:bg-black/20 rounded-full overflow-hidden">
                                                        <Motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${opt.percentage}%` }}
                                                            transition={{ duration: 1, delay: 0.2 }}
                                                            className={`h-full rounded-full ${opt.isCorrect ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : colors.bar}`}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className={cx(typography.micro, "flex items-center gap-3 px-5 py-3 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 !tracking-normal")}>
                                        <CheckCircle2 size={16} />
                                        <span>Accuracy Rating: {q.correctPercentage}% Across Roster</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </Motion.div>
                )}
            </AnimatePresence>

            {/* Persistent CTA */}
            <div className="flex justify-center pt-10">
                <button
                    onClick={() => navigate('/workspace')}
                    className={cx(buttonStyles.base, buttonStyles.primary, buttonStyles.sizeLg, "!rounded-2xl px-16 h-18 group")}
                >
                    Return to Control Center
                    <ArrowRight size={18} className="ml-3 group-hover:translate-x-2 transition-transform" />
                </button>
            </div>
        </div>
    );
};

export default LiveResult;
