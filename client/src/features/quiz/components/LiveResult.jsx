import { useEffect, useState } from 'react';
import { Trophy, BarChart2, Users, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import api from '../services/quiz.service';

const optionColors = [
    { bg: 'bg-blue-100', bar: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-200' },
    { bg: 'bg-violet-100', bar: 'bg-violet-500', text: 'text-violet-700', border: 'border-violet-200' },
    { bg: 'theme-status-warning', bar: 'bg-(--qb-warning-bg-strong)', text: 'theme-tone-warning', border: 'border-(--qb-warning-border)' },
    { bg: 'bg-rose-100', bar: 'bg-rose-500', text: 'text-rose-700', border: 'border-rose-200' },
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
        <div className="app-page max-w-5xl space-y-10 animate-in fade-in zoom-in duration-700">
            {/* Header */}
            <div className="text-center space-y-3">
                <div className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-600 text-[11px] font-medium tracking-wide rounded-full border border-emerald-200 uppercase">
                    Session Complete
                </div>
                <h1 className="page-title text-3xl md:text-4xl font-medium">Final Results</h1>
                <p className="text-slate-500 font-medium tracking-wide text-xs">
                    {activeQuiz?.title} &middot; Code: {sessionCode || activeQuiz?.roomCode}
                </p>
            </div>

            {/* Podium */}
            <div className="grid grid-cols-3 gap-4 items-end pb-10">
                {/* 2nd */}
                <div className="h-56 bg-white p-6 rounded-xl border-x border-b border-gray-100 flex flex-col items-center justify-end relative border-t-2 border-t-slate-300">
                    <div className="absolute -top-10 w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-medium text-2xl border border-slate-200">2</div>
                    <p className="text-base font-medium truncate w-full text-center text-slate-900">{topThree[1]?.name || '—'}</p>
                    <p className="text-2xl font-medium text-slate-700">{topThree[1]?.score || 0}</p>
                    <p className="text-[11px] font-medium text-slate-400 mt-1">Points</p>
                </div>
                {/* 1st */}
                <div className="theme-status-caution h-72 p-6 rounded-xl border-x border-b flex flex-col items-center justify-end relative border-t-2 z-10">
                    <Trophy className="theme-tone-caution absolute -top-14 w-28 h-28" />
                    <p className="text-lg font-medium truncate w-full text-center text-slate-900">{topThree[0]?.name || '—'}</p>
                    <p className="theme-tone-caution text-4xl font-medium">{topThree[0]?.score || 0}</p>
                    <p className="theme-tone-caution text-[11px] font-medium mt-1 opacity-75">Points</p>
                </div>
                {/* 3rd */}
                <div className="h-44 theme-surface p-6 rounded-xl border-x border-b theme-border flex flex-col items-center justify-end relative border-t-2 border-t-(--qb-warning-border)">
                    <div className="theme-status-warning absolute -top-9 w-18 h-18 rounded-full border flex items-center justify-center font-medium text-2xl px-4 py-3">3</div>
                    <p className="text-base font-medium truncate w-full text-center text-slate-900">{topThree[2]?.name || '—'}</p>
                    <p className="text-2xl font-medium text-slate-700">{topThree[2]?.score || 0}</p>
                    <p className="text-[11px] font-medium text-slate-400 mt-1">Points</p>
                </div>
            </div>

            {/* Tab bar */}
            <div className="flex gap-2 bg-gray-100 rounded-2xl p-1 w-fit">
                <button
                    onClick={() => setActiveTab('leaderboard')}
                    className={`px-5 py-2 rounded-lg text-xs font-medium uppercase tracking-wide transition-colors ${activeTab === 'leaderboard' ? 'bg-white text-indigo-600 border border-gray-100' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <span className="flex items-center gap-2"><Users size={12} /> Top 10</span>
                </button>
                <button
                    onClick={() => setActiveTab('stats')}
                    className={`px-5 py-2 rounded-lg text-xs font-medium uppercase tracking-wide transition-colors ${activeTab === 'stats' ? 'bg-white text-indigo-600 border border-gray-100' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <span className="flex items-center gap-2"><BarChart2 size={12} /> Question Stats</span>
                </button>
            </div>

            {/* Leaderboard tab */}
            {activeTab === 'leaderboard' && (
                <div className="ui-section-card rounded-xl p-0 overflow-hidden shadow-none">
                    <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-medium text-slate-900 uppercase text-sm tracking-wide">Full Leaderboard</h3>
                        <span className="px-3 py-1 bg-white text-xs font-medium text-slate-500 uppercase rounded-full border border-gray-100">
                            {leaderboard.length} Participants
                        </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {[...topThree, ...others].map((p, i) => (
                            <div key={p.name || i} className="flex justify-between items-center px-8 py-4 hover:bg-gray-50 transition-all">
                                <div className="flex items-center gap-5">
                                    <span className={`font-medium text-lg w-8 ${i === 0 ? 'theme-tone-caution' : i === 1 ? 'text-slate-400' : i === 2 ? 'theme-tone-warning' : 'text-slate-300'
                                        }`}>#{i + 1}</span>
                                    <span className="font-medium text-lg tracking-tight text-slate-900">{p.name}</span>
                                </div>
                                <span className="text-xl font-medium text-indigo-600">{p.score}</span>
                            </div>
                        ))}
                        {leaderboard.length === 0 && (
                            <p className="text-center py-12 text-slate-400 font-medium tracking-wide text-xs uppercase">
                                No participants recorded
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Question stats tab */}
            {activeTab === 'stats' && (
                <div className="space-y-6">
                    {loadingStats && (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={32} className="text-indigo-500 animate-spin" />
                        </div>
                    )}
                    {!loadingStats && !stats && (
                        <div className="bg-white rounded-xl p-12 text-center text-slate-400 font-medium border border-gray-100">
                            Stats not available for this session.
                        </div>
                    )}
                    {!loadingStats && stats?.questionStats?.map((q, qi) => (
                        <div key={q.questionId || qi} className="ui-section-card rounded-xl space-y-5 shadow-none">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <span className="text-[11px] font-medium text-indigo-500 uppercase tracking-wide">Q{qi + 1}</span>
                                    <p className="text-xl font-medium text-slate-900 leading-snug">{q.text}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-2xl font-medium text-slate-900">{q.totalAnswered}</p>
                                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">answered</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {q.options.map((opt, oi) => {
                                    const colors = optionColors[oi % optionColors.length];
                                    return (
                                        <div key={oi} className={`rounded-2xl border p-4 space-y-2 ${opt.isCorrect
                                            ? 'bg-emerald-50 border-emerald-200'
                                            : `${colors.bg} ${colors.border}`
                                            }`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {opt.isCorrect
                                                        ? <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                                                        : <XCircle size={14} className={`${colors.text} shrink-0`} />
                                                    }
                                                    <span className={`text-sm font-medium ${opt.isCorrect ? 'text-emerald-800' : colors.text}`}>
                                                        {opt.option}
                                                    </span>
                                                    {opt.isCorrect && (
                                                        <span className="text-[10px] font-medium bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
                                                            Correct
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-lg font-medium ${opt.isCorrect ? 'text-emerald-700' : colors.text}`}>
                                                        {opt.percentage}%
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium ml-1">({opt.count})</span>
                                                </div>
                                            </div>
                                            {/* Percentage bar */}
                                            <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${opt.isCorrect ? 'bg-emerald-500' : colors.bar}`}
                                                    style={{ width: `${opt.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Correct stat summary */}
                            <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2 w-fit">
                                <CheckCircle2 size={14} />
                                {q.correctPercentage}% selected the correct answer
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex justify-center pt-4">
                <button
                    onClick={() => navigate('/studio')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-600 px-16 py-4 text-lg font-medium rounded-lg transition-colors"
                >
                    Back to Dashboard
                </button>
            </div>
        </div>
    );
};

export default LiveResult;

