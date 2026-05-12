import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Target, Clock, Zap, AlertTriangle, CheckCircle2, TrendingUp, XCircle, BrainCircuit } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import apiClient from '../../../services/apiClient';
import PageHeader from '../../../components/layout/PageHeader';

import { layoutStyles } from '../../../styles/layoutStyles';
import { textStyles, panelStyles, dividerStyles, components, layout, cx } from '../../../styles/index';

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
                const res = await apiClient.get(`/analytics/${sessionId}/participant/${userId}`, {
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
            <div className={cx(layout.page, "py-24 flex flex-col items-center justify-center")}>
                <div className="w-8 h-8 border-4 border-[var(--qb-primary)] border-t-transparent rounded-full animate-spin" />
                <p className={textStyles.metaLabel + " animate-pulse"}>Loading participant insights...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className={cx(layout.page, "py-24 text-center")}>
                <div className="w-20 h-20 mx-auto bg-red-500/10 text-red-500 rounded-full flex items-center justify-center">
                    <AlertTriangle size={32} />
                </div>
                <h2 className={textStyles.titleXl}>Data Unavailable</h2>
                <p className={textStyles.subtitle + " max-w-md mx-auto"}>{error}</p>
                <button 
                    onClick={() => navigate(`/analytics/${sessionId}`)}
                    className={components.button.base + " " + components.button.sizes.lg + " " + components.button.variants.primary + " !rounded-2xl"}
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
        <div className={cx(layout.page, "pb-24")}>
            <PageHeader
                breadcrumbs={[
                    { label: 'HISTORY', href: '/history' },
                    { label: 'Session Details', href: `/analytics/${sessionId}` },
                    { label: user.name }
                ]}
            />
            
            <div className="flex items-center gap-4">
                {data.ranking && (
                    <div className={`${components.badge.info} !bg-indigo-500/10 !text-indigo-500 py-2 px-4 rounded-2xl font-bold border-none`}>
                        Rank: {data.ranking.rank} / {data.ranking.totalParticipants}
                    </div>
                )}
                <div className={`${components.badge.primary} py-2 px-4 rounded-2xl font-bold !bg-opacity-10 !text-[var(--qb-primary)] border-none`}>
                    Score: {summary.correct} / {summary.totalQuestions}
                </div>
            </div>

            {/* Performance Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={components.analytics.card + " space-y-3 !p-6"}>
                    <div className="flex items-center gap-2 text-[var(--qb-primary)]">
                        <Target size={18} />
                        <span className={components.analytics.metricLabel}>Accuracy</span>
                    </div>
                    <p className={textStyles.value2Xl}>{summary.accuracy}%</p>
                </div>
                
                <div className={components.analytics.card + " space-y-3 !p-6"}>
                    <div className="flex items-center gap-2 text-emerald-500">
                        <Zap size={18} />
                        <span className={components.analytics.metricLabel}>Speed</span>
                    </div>
                    <p className={textStyles.value2Xl}>{summary.avgTime}s</p>
                    <p className={textStyles.tinyMuted + " uppercase tracking-wider font-bold"}>Avg Response</p>
                </div>

                <div className={components.analytics.card + " space-y-3 !p-6"}>
                    <div className="flex items-center gap-2 text-blue-500">
                        <TrendingUp size={18} />
                        <span className={components.analytics.metricLabel}>Pace</span>
                    </div>
                    <p className={textStyles.value2Xl}>{summary.fasterThanAvgPercent}%</p>
                    <p className={textStyles.tinyMuted + " uppercase tracking-wider font-bold"}>Faster than Session Avg</p>
                </div>

                <div className={components.analytics.card + " space-y-3 !p-6"}>
                    <div className="flex items-center gap-2 text-red-500">
                        <XCircle size={18} />
                        <span className={components.analytics.metricLabel}>Errors</span>
                    </div>
                    <p className={textStyles.value2Xl}>{summary.totalQuestions - summary.correct}</p>
                    <p className={textStyles.tinyMuted + " uppercase tracking-wider font-bold"}>Total Mistakes</p>
                </div>
            </div>

            {/* Mistake Analysis Panel */}
            {mistakes.length > 0 && (
                <div className={components.analytics.card + " border-red-200 dark:border-red-500/20 relative overflow-hidden !p-8"}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                    <h3 className={textStyles.title + " text-red-600 dark:text-red-400 flex items-center gap-2 mb-6"}>
                        <BrainCircuit size={20} /> AI Mistake Analysis
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                        {mistakes.map((m, i) => (
                            <div key={i} className={components.analytics.subtleCard + " space-y-3 bg-white dark:bg-black/20 !p-5"}>
                                <div className="flex items-center justify-between">
                                    <span className={textStyles.metaLabel + " font-black"}>Q{timeline.findIndex(t => t.questionId === m.questionId) + 1}</span>
                                    {m.insight && (
                                        <span className={`${components.badge.neutral} ${m.insight.bg} ${m.insight.color} !text-[10px] border-none font-black uppercase tracking-widest`}>
                                            {m.insight.type}
                                        </span>
                                    )}
                                </div>
                                <p className={textStyles.bodyStrong + " line-clamp-2 !theme-text-primary text-sm"} title={m.questionText}>{m.questionText}</p>
                                <div className={"flex items-center justify-between " + textStyles.tinyMuted + " font-bold pt-3 border-t theme-border"}>
                                    <span className="text-red-500">Chose: {m.selectedOption}</span>
                                    <span className="text-emerald-500">Actual: {m.correctOption || '?'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Visual Timeline Bar */}
            <div className={components.analytics.card + " !p-8"}>
                <h3 className={textStyles.title + " mb-6"}>Performance Timeline</h3>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                    {timeline.map((s, i) => (
                        <div 
                            key={i}
                            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white cursor-pointer hover:scale-110 transition-transform ${
                                s.isCorrect ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-red-500 shadow-red-500/20'
                            } shadow-sm`}
                            title={`Q${i + 1}: ${s.isCorrect ? 'Correct' : 'Incorrect'} in ${s.responseTime}s`}
                        >
                            {i + 1}
                        </div>
                    ))}
                </div>
            </div>

            <div className={layoutStyles.pageStack}>
                <h3 className={textStyles.title + " px-2"}>Detailed Responses</h3>
                <div className={layoutStyles.pageStack}>
                    {timeline.map((s, i) => (
                        <Motion.div 
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05 }}
                            className={components.analytics.card + " flex flex-col md:flex-row gap-8 hover:border-[var(--qb-primary)]/30 transition-colors !p-8"}
                        >
                            {/* Left: Status & Timing */}
                            <div className="shrink-0 w-full md:w-40 flex flex-col justify-center items-center md:items-start space-y-3 pb-6 md:pb-0 border-b md:border-b-0 md:border-r theme-border">
                                <div className="flex items-center gap-2">
                                    <span className={textStyles.metaLabel + " font-black"}>QUESTION {i + 1}</span>
                                    <div className={s.isCorrect ? components.badge.success : components.badge.danger}>
                                        {s.isCorrect ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                        <span className="ml-1 font-black uppercase tracking-widest text-[10px]">{s.isCorrect ? 'Correct' : 'Incorrect'}</span>
                                    </div>
                                </div>
                                <div className="space-y-1 w-full text-center md:text-left mt-2">
                                    <p className={textStyles.value4Xl + " !text-4xl"}>{s.responseTime}s</p>
                                    <div className="flex items-center justify-center md:justify-start gap-1.5">
                                        <Clock size={12} className="theme-text-muted" />
                                        <span className={`${textStyles.metaLabel} font-black uppercase tracking-widest !text-[10px] ${s.fasterThanAvg ? 'text-emerald-500' : 'text-amber-500'}`}>
                                            {s.fasterThanAvg ? '⚡ Faster' : '🐢 Slower'} than avg
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Question & Content */}
                            <div className="flex-1 space-y-6">
                                <h4 className={textStyles.titleLg + " leading-relaxed"}>{s.questionText}</h4>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                                    <div className="space-y-2">
                                        <p className={textStyles.metaLabel + " uppercase tracking-widest font-black"}>Participant Answer</p>
                                        <div className={`text-base font-black p-3 rounded-xl border ${s.isCorrect ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20' : 'bg-red-500/5 text-red-500 border-red-500/20'}`}>
                                            Option {s.selectedOption}
                                        </div>
                                    </div>
                                    
                                    {!s.isCorrect && s.correctOption && (
                                        <div className="space-y-2">
                                            <p className={textStyles.metaLabel + " uppercase tracking-widest font-black"}>Correct Answer</p>
                                            <div className="text-base font-black p-3 rounded-xl bg-emerald-500/5 text-emerald-500 border border-emerald-500/20">
                                                Option {s.correctOption}
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="space-y-2">
                                        <p className={textStyles.metaLabel + " uppercase tracking-widest font-black"}>Global Accuracy</p>
                                        <div className="text-base font-black p-3 rounded-xl bg-black/5 dark:bg-white/5 border theme-border theme-text-primary text-center">
                                            {s.globalAccuracy !== null ? `${s.globalAccuracy}%` : 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ParticipantAnalyticsPage;

