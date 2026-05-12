import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Download, CheckCircle2, XCircle, Users, Activity, Clock, Trophy, BarChart3, ChevronRight } from 'lucide-react';
import { getQuizAnalytics, getSessionParticipants } from '../services/host.service';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useQuizStore } from '../../../stores/useQuizStore';
import PageHeader from '../../../components/layout/PageHeader';
import HistoryLeaderboardModal from '../components/HistoryLeaderboardModal';
import LoadingScreen from '../../../components/common/LoadingScreen';
import { textStyles, components, typography, buttonStyles, cards, layout, cx } from '../../../styles/index';

const SessionHistoryDetailPage = () => {
    const { templateId, sessionId, id, quizid } = useParams();
    const routeId = sessionId || quizid || id;
    const location = useLocation();
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const getHistoryForRole = useQuizStore((state) => state.getHistoryForRole);
    const getQuizLeaderboardCached = useQuizStore((state) => state.getQuizLeaderboardCached);
    const [selectedQuiz, setSelectedQuiz] = useState(location.state?.record || null);
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [joinedParticipants, setJoinedParticipants] = useState([]);
    const [participantCount, setParticipantCount] = useState(null);

    useEffect(() => {
        let active = true;
        const loadRecord = async () => {
            try {
                let record = location.state?.record || null;
                if (!record && routeId && user?.role) {
                    const history = await getHistoryForRole(user.role);
                    record = (history || []).find((row) => {
                        const rowQuizId = String(row.quizId || row._id || '');
                        const rowRoomCode = String(row.roomCode || '');
                        const rowId = String(row._id || '');
                        return rowQuizId === String(routeId) || rowRoomCode === String(routeId) || rowId === String(routeId);
                    }) || null;
                }
                if (!record) { if (active) navigate('/history'); return; }
                if (active) setSelectedQuiz(record);
            } finally { if (active) setLoading(false); }
        };
        loadRecord().catch(() => { if (active) { setLoading(false); navigate('/history'); } });
        return () => { active = false; };
    }, [getHistoryForRole, location.state?.record, navigate, routeId, user?.role]);

    useEffect(() => {
        let active = true;
        const loadhostDetails = async () => {
            if (!selectedQuiz || user?.role !== 'host') return;
            const qId = selectedQuiz.quizId || selectedQuiz._id;
            if (!qId) return;
            try {
                const [analyticsData, leaderboardData, participantsData] = await Promise.all([
                    getQuizAnalytics(qId),
                    getQuizLeaderboardCached(qId),
                    selectedQuiz.roomCode ? getSessionParticipants(selectedQuiz.roomCode) : Promise.resolve(null),
                ]);
                if (!active) return;
                setAnalytics(analyticsData || null);
                setLeaderboard(Array.isArray(leaderboardData) ? leaderboardData : []);
                setJoinedParticipants(Array.isArray(participantsData?.participants) ? participantsData.participants : []);
                setParticipantCount(participantsData?.participantCount ?? analyticsData?.summary?.participantCount ?? selectedQuiz.participantCount ?? 0);
            } catch {
                if (!active) return;
                setParticipantCount(selectedQuiz.participantCount ?? 0);
            }
        };
        loadhostDetails();
        return () => { active = false; };
    }, [getQuizLeaderboardCached, selectedQuiz, user?.role]);

    if (loading) return <LoadingScreen />;

    if (!selectedQuiz) return null;
    const totalParticipants = participantCount ?? selectedQuiz.participantCount ?? analytics?.summary?.participantCount ?? 0;
    const totalAnswers = selectedQuiz.totalAnswers ?? analytics?.summary?.totalAnswers ?? 0;
    const sessionTimeLabel = new Date(selectedQuiz.createdAt || selectedQuiz.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const statusLabel = String(selectedQuiz.status || 'completed').toUpperCase();

    const exportToCSV = (record) => {
        const ishost = user.role === 'host';
        let csvContent = ishost ? 'Quiz Title,Room Code,Date,Participants,Total Answers\n' : 'Question,Your Answer,Correct,Points\n';
        if (ishost) csvContent += `"${record.title}",${record.roomCode},${new Date(record.createdAt).toLocaleDateString()},${record.participantCount},${record.totalAnswers}\n`;
        else (record.answers || []).forEach(ans => { csvContent += `"${ans.questionText}","${ans.selected}",${ans.isCorrect},${ans.score}\n`; });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${(record.quizTitle || record.title || 'quiz').replace(/\s+/g, '_')}_results.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className={cx(layout.page, 'min-h-screen')}>
            <PageHeader
                breadcrumbs={[{ label: 'History', href: '/history' }, { label: 'Analytics' }]}
                actions={(
                    <div className="flex items-center gap-4">
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-black tracking-widest">
                            {statusLabel}
                        </div>
                        <button
                            type="button"
                            onClick={() => exportToCSV(selectedQuiz)}
                            className={`${components.button.base} ${components.button.sizes.md} ${components.button.variants.secondary} !rounded-2xl px-6 flex items-center gap-2 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-indigo-500/5`}
                        >
                            <Download size={14} /> <span>Export Results</span>
                        </button>
                    </div>
                )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    { label: 'Total Participants', value: totalParticipants, icon: Users, color: 'indigo' },
                    { label: 'Total Answers', value: totalAnswers, icon: Activity, color: 'emerald' },
                    { label: 'Session Date', value: sessionTimeLabel, icon: Clock, color: 'amber' }
                ].map((stat, i) => (stat.label === 'Session Date' ? (
                    <div key={i} className={`${components.analytics.card} !p-8 border theme-border space-y-3`}>
                        <div className={`w-10 h-10 rounded-xl bg-${stat.color}-500/10 text-${stat.color}-500 flex items-center justify-center`}>
                            <stat.icon size={20} />
                        </div>
                        <div className="space-y-1">
                            <p className={textStyles.metaLabel + " font-black uppercase tracking-widest opacity-60"}>{stat.label}</p>
                            <p className="text-lg font-black theme-text-primary">{stat.value}</p>
                        </div>
                    </div>
                ) : (
                    <div key={i} className={`${components.analytics.card} !p-8 border theme-border space-y-3`}>
                        <div className={`w-10 h-10 rounded-xl bg-${stat.color}-500/10 text-${stat.color}-500 flex items-center justify-center`}>
                            <stat.icon size={20} />
                        </div>
                        <div className="space-y-1">
                            <p className={textStyles.metaLabel + " font-black uppercase tracking-widest opacity-60"}>{stat.label}</p>
                            <p className="text-4xl font-black theme-text-primary tracking-tighter">{stat.value}</p>
                        </div>
                    </div>
                )))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 space-y-8">
                    {user.role === 'participant' ? (
                        <section className={`${components.analytics.card} !p-8 border theme-border space-y-6`}>
                            <div className="flex items-center gap-3">
                                <BarChart3 size={20} className="text-indigo-500" />
                                <h3 className={textStyles.value2Xl + " !font-black !text-xl"}>Mastery Breakdown</h3>
                            </div>
                            <div className="overflow-x-auto -mx-8 px-8">
                                <table className="w-full text-left border-separate border-spacing-y-2">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase tracking-[0.2em] theme-text-muted">
                                            <th className="pb-4 pl-4">Question</th>
                                            <th className="pb-4">Your Answer</th>
                                            <th className="pb-4">Status</th>
                                            <th className="pb-4 pr-4 text-right">Points</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(!selectedQuiz.answers || selectedQuiz.answers.length === 0) ? (
                                            <tr><td colSpan={4} className="py-20 text-center text-slate-400 font-bold">No records found</td></tr>
                                        ) : selectedQuiz.answers.map((ans, idx) => (
                                            <Motion.tr
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                key={idx}
                                                className="group"
                                            >
                                                <td className="py-4 pl-4 rounded-l-2xl bg-gray-50 dark:bg-white/5 border-y border-l theme-border group-hover:border-indigo-500/30 transition-colors">
                                                    <p className="text-sm font-black theme-text-primary truncate max-w-[300px]" title={ans.questionText}>{ans.questionText}</p>
                                                </td>
                                                <td className="py-4 bg-gray-50 dark:bg-white/5 border-y theme-border group-hover:border-indigo-500/30 transition-colors">
                                                    <span className="text-sm font-bold opacity-70">{ans.selected || 'SKIPPED'}</span>
                                                </td>
                                                <td className="py-4 bg-gray-50 dark:bg-white/5 border-y theme-border group-hover:border-indigo-500/30 transition-colors">
                                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${ans.isCorrect ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                        {ans.isCorrect ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                        {ans.isCorrect ? 'Correct' : 'Incorrect'}
                                                    </div>
                                                </td>
                                                <td className="py-4 pr-4 rounded-r-2xl bg-gray-50 dark:bg-white/5 border-y border-r theme-border group-hover:border-indigo-500/30 transition-colors text-right">
                                                    <span className="text-sm font-black theme-text-primary">{ans.score ?? 0}</span>
                                                </td>
                                            </Motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    ) : (
                        <div className="space-y-8">
                            <section className={`${components.analytics.card} !p-8 border theme-border space-y-6`}>
                                <div className="flex items-center gap-3">
                                    <Trophy size={20} className="text-indigo-500" />
                                    <h3 className={textStyles.value2Xl + " !font-black !text-xl"}>Mastery Leaderboard</h3>
                                </div>
                                <div className="space-y-3">
                                    {leaderboard.length === 0 ? (
                                        <div className="py-12 text-center text-slate-400 font-bold">Lobby data not yet synchronized</div>
                                    ) : leaderboard.map((entry, idx) => (
                                        <Motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            key={idx}
                                            className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border theme-border group hover:border-indigo-500/30 transition-all"
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : idx === 1 ? 'bg-slate-300 text-slate-700' : idx === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 dark:bg-white/10 text-slate-400'}`}>
                                                #{idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-black theme-text-primary">{entry.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{entry.time ? `${entry.time.toFixed(1)}s avg time` : 'Mastery Record'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-black text-indigo-500">{entry.score ?? 0}</p>
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Points</p>
                                            </div>
                                        </Motion.div>
                                    ))}
                                </div>
                            </section>

                            <section className={`${components.analytics.card} !p-8 border theme-border space-y-6`}>
                                <div className="flex items-center gap-3">
                                    <BarChart3 size={20} className="text-indigo-500" />
                                    <h3 className={textStyles.value2Xl + " !font-black !text-xl"}>MCQ Intelligence</h3>
                                </div>
                                <div className="space-y-4">
                                    {analytics?.questionStats?.map((q, i) => (
                                        <div key={i} className="p-6 rounded-[2rem] bg-gray-50 dark:bg-white/5 border theme-border space-y-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="space-y-1 min-w-0">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Question {i + 1}</p>
                                                    <h4 className="text-sm font-black theme-text-primary truncate" title={q.text}>{q.text}</h4>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-xl font-black text-emerald-500">{q.successRate}%</p>
                                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Accuracy</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                {[
                                                    { label: 'Attempts', val: q.total },
                                                    { label: 'Correct', val: Math.round((q.successRate / 100) * q.total) },
                                                    { label: 'Avg Time', val: `${Number(q.avgTime || 0).toFixed(1)}s` }
                                                ].map((box, bi) => (
                                                    <div key={bi} className="p-3 rounded-xl bg-white dark:bg-white/5 border theme-border">
                                                        <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">{box.label}</p>
                                                        <p className="text-xs font-black theme-text-primary">{box.val}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-4 space-y-8">
                    <section className={`${components.analytics.card} !p-8 border theme-border space-y-6`}>
                        <div className="flex items-center gap-3">
                            <Hash size={20} className="text-indigo-500" />
                            <h3 className={textStyles.value2Xl + " !font-black !text-xl"}>Metadata</h3>
                        </div>
                        <div className="space-y-4">
                            {[
                                { label: 'Room Code', val: selectedQuiz.roomCode || 'N/A' },
                                { label: 'Session Hash', val: selectedQuiz.sessionId || selectedQuiz._id },
                                { label: 'Avg Answer Rate', val: totalParticipants ? (totalAnswers / totalParticipants).toFixed(1) : '0.0' }
                            ].map((row, ri) => (
                                <div key={ri} className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{row.label}</p>
                                    <p className="text-sm font-bold theme-text-primary font-mono break-all">{row.val}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default SessionHistoryDetailPage;



