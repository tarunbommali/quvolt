import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, Clock, Zap, AlertTriangle, CheckCircle2, TrendingUp, XCircle, BrainCircuit } from 'lucide-react';
import useAuthStore from '../../auth/store/useAuthStore';
import { api } from '../../../utils/api';
import SubHeader from '../../../components/layout/SubHeader';

const getMistakeInsight = (s) => {
    if (s.isCorrect) return null;
    if (s.globalAccuracy > 70) return { type: 'Careless Mistake', color: 'text-amber-500', bg: 'bg-amber-500/10' };
    if (s.globalAccuracy < 30) return { type: 'Concept Gap', color: 'text-red-500', bg: 'bg-red-500/10' };
    if (s.diffFromAvg < -5) return { type: 'Rushed', color: 'text-orange-500', bg: 'bg-orange-500/10' };
    return { type: 'Standard Error', color: 'text-gray-500', bg: 'bg-gray-500/10' };
};

const ParticipantAnalyticsPage = () => {
    const { sessionId, userId } = useParams();
    const navigate = useNavigate();
    const { token } = useAuthStore();
    
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchParticipantData = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/analytics/${sessionId}/participant/${userId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setData(res.data.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load participant data');
            } finally {
                setLoading(false);
            }
        };

        if (sessionId && userId) {
            fetchParticipantData();
        }
    }, [sessionId, userId, token]);

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-6 py-24 flex flex-col items-center justify-center space-y-4">
                <div className="w-8 h-8 border-4 border-[var(--qb-primary)] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold theme-text-muted animate-pulse">Loading participant insights...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="max-w-7xl mx-auto px-6 py-24 text-center space-y-6">
                <div className="w-20 h-20 mx-auto bg-red-500/10 text-red-500 rounded-full flex items-center justify-center">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-2xl font-black theme-text-primary">Data Unavailable</h2>
                <p className="text-base theme-text-secondary max-w-md mx-auto">{error}</p>
                <button 
                    onClick={() => navigate(`/analytics/${sessionId}`)}
                    className="px-6 py-3 bg-[var(--qb-primary)] text-white rounded-2xl font-bold hover:brightness-110 transition-all"
                >
                    Return to Session Analytics
                </button>
            </div>
        );
    }

    const { summary, timeline, user } = data;

    // Derived Mistake Analysis
    const mistakes = timeline.filter(s => !s.isCorrect).map(s => ({
        ...s,
        insight: getMistakeInsight(s)
    }));

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 pb-24 space-y-10">
            <SubHeader
                title={user.name}
                subtitle={`Performance Drilldown for session ${sessionId}`}
                breadcrumbs={[
                    { label: 'HISTORY', href: '/history' },
                    { label: 'Session Details', href: `/history/${sessionId}` },
                    { label: user.name }
                ]}
            />
            
            <div className="flex items-center gap-4">
                {data.ranking && (
                    <div className="px-4 py-2 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold">
                        Rank: {data.ranking.rank} / {data.ranking.totalParticipants}
                    </div>
                )}
                <div className="px-4 py-2 rounded-2xl bg-[var(--qb-primary)]/10 text-[var(--qb-primary)] font-bold">
                    Score: {summary.correct} / {summary.totalQuestions}
                </div>
            </div>

            {/* Performance Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="theme-surface border theme-border p-5 rounded-3xl space-y-3">
                        <div className="flex items-center gap-2 text-[var(--qb-primary)]">
                            <Target size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider">Accuracy</span>
                        </div>
                        <p className="text-2xl font-black theme-text-primary">{summary.accuracy}%</p>
                    </div>
                    
                    <div className="theme-surface border theme-border p-5 rounded-3xl space-y-3">
                        <div className="flex items-center gap-2 text-emerald-500">
                            <Zap size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider">Speed</span>
                        </div>
                        <p className="text-2xl font-black theme-text-primary">{summary.avgTime}s</p>
                        <p className="text-[10px] font-bold theme-text-muted uppercase tracking-wider">Avg Response</p>
                    </div>

                    <div className="theme-surface border theme-border p-5 rounded-3xl space-y-3">
                        <div className="flex items-center gap-2 text-blue-500">
                            <TrendingUp size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider">Pace</span>
                        </div>
                        <p className="text-2xl font-black theme-text-primary">{summary.fasterThanAvgPercent}%</p>
                        <p className="text-[10px] font-bold theme-text-muted uppercase tracking-wider">Faster than Session Avg</p>
                    </div>

                    <div className="theme-surface border theme-border p-5 rounded-3xl space-y-3">
                        <div className="flex items-center gap-2 text-red-500">
                            <XCircle size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider">Errors</span>
                        </div>
                        <p className="text-2xl font-black theme-text-primary">{summary.totalQuestions - summary.correct}</p>
                        <p className="text-[10px] font-bold theme-text-muted uppercase tracking-wider">Total Mistakes</p>
                    </div>
                </div>

                {/* Mistake Analysis Panel */}
                {mistakes.length > 0 && (
                    <div className="theme-surface border border-red-200 dark:border-red-500/20 p-6 rounded-3xl space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                        <h3 className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                            <BrainCircuit size={20} /> AI Mistake Analysis
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                            {mistakes.map((m, i) => (
                                <div key={i} className="bg-white dark:bg-black/20 border theme-border p-4 rounded-2xl space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold theme-text-secondary">Q{timeline.findIndex(t => t.questionId === m.questionId) + 1}</span>
                                        {m.insight && (
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${m.insight.color} ${m.insight.bg}`}>
                                                {m.insight.type}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs font-medium theme-text-primary line-clamp-2" title={m.questionText}>{m.questionText}</p>
                                    <div className="flex items-center justify-between text-[10px] font-bold pt-2 border-t theme-border">
                                        <span className="text-red-500">Chose: {m.selectedOption}</span>
                                        <span className="text-emerald-500">Actual: {m.correctOption || '?'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Visual Timeline Bar */}
                <div className="theme-surface border theme-border p-6 rounded-3xl space-y-4">
                    <h3 className="text-sm font-bold theme-text-primary">Performance Timeline</h3>
                    <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin">
                        {timeline.map((s, i) => (
                            <div 
                                key={i}
                                className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white cursor-pointer hover:scale-110 transition-transform ${
                                    s.isCorrect ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-red-500 shadow-red-500/20'
                                } shadow-sm`}
                                title={`Q${i + 1}: ${s.isCorrect ? 'Correct' : 'Incorrect'} in ${s.responseTime}s`}
                            >
                                {i + 1}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Question Timeline Feed */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold theme-text-primary px-2">Detailed Responses</h3>
                    <div className="space-y-4">
                        {timeline.map((s, i) => (
                            <div key={i} className="theme-surface border theme-border p-6 rounded-3xl flex flex-col md:flex-row gap-6 hover:border-[var(--qb-primary)]/30 transition-colors">
                                {/* Left: Status & Timing */}
                                <div className="shrink-0 w-full md:w-32 flex flex-col justify-center items-center md:items-start space-y-2 pb-4 md:pb-0 border-b md:border-b-0 md:border-r theme-border">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black theme-text-muted">Q{i + 1}</span>
                                        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${s.isCorrect ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {s.isCorrect ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                            {s.isCorrect ? 'Correct' : 'Incorrect'}
                                        </div>
                                    </div>
                                    <div className="space-y-1 w-full text-center md:text-left mt-2">
                                        <p className="text-xl font-black theme-text-primary">{s.responseTime}s</p>
                                        <div className="flex items-center justify-center md:justify-start gap-1">
                                            <Clock size={10} className="theme-text-muted" />
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${s.fasterThanAvg ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                {s.fasterThanAvg ? '⚡ Faster' : '🐢 Slower'} than avg ({s.globalAvgTime}s)
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Question & Content */}
                                <div className="flex-1 space-y-4">
                                    <h4 className="text-sm font-bold theme-text-primary leading-relaxed">{s.questionText}</h4>
                                    
                                    <div className="flex items-center gap-6">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold uppercase tracking-wider theme-text-muted">Participant Answer</p>
                                            <p className={`text-base font-black ${s.isCorrect ? 'text-emerald-500' : 'text-red-500'}`}>
                                                Option {s.selectedOption}
                                            </p>
                                        </div>
                                        
                                        {!s.isCorrect && s.correctOption && (
                                            <div className="space-y-1 border-l theme-border pl-6">
                                                <p className="text-[10px] font-bold uppercase tracking-wider theme-text-muted">Correct Answer</p>
                                                <p className="text-base font-black text-emerald-500">
                                                    Option {s.correctOption}
                                                </p>
                                            </div>
                                        )}
                                        
                                        <div className="space-y-1 border-l theme-border pl-6">
                                            <p className="text-[10px] font-bold uppercase tracking-wider theme-text-muted">Global Accuracy</p>
                                            <p className="text-base font-black theme-text-primary">
                                                {s.globalAccuracy !== null ? `${s.globalAccuracy}%` : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
        </div>
    );
};

export default ParticipantAnalyticsPage;
