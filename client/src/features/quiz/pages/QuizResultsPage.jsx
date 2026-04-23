import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Users, Trophy, Clock, ExternalLink, Search, Activity, Layout, BarChart3 } from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import { useQuizStore } from '../../../stores/useQuizStore';
import { isTransientApiError } from '../services/quiz.service';
import Skeleton from '../../components/ui/Skeleton';
import ViewportPrefetch from '../../components/common/ViewportPrefetch';
import { prefetchHistoryDetailRoute } from '../../../utils/routePrefetch';
import { textStyles, panelStyles, dividerStyles, components, layout, cx } from '../../../styles/index';

const QuizResultsPage = () => {
    const { templateId, quizId } = useParams();
    const routeTemplateId = templateId || quizId;
    const location = useLocation();
    const navigate = useNavigate();

    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const getHistoryForRole = useQuizStore((state) => state.getHistoryForRole);

    const quizTitle = location.state?.quiz?.title || location.state?.quizTitle || 'Quiz Results';

    useEffect(() => {
        const fetchResults = async () => {
            try {
                setLoading(true);
                setError('');
                const data = await getHistoryForRole('host');
                const filtered = data.filter((record) => String(record.quizId) === String(routeTemplateId));
                setRecords(filtered);
            } catch (err) {
                setError(
                    isTransientApiError(err)
                        ? 'Temporary network issue. Results could not be loaded after retries.'
                        : 'Failed to load quiz results.',
                );
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [routeTemplateId, getHistoryForRole]);

    const filteredRecords = useMemo(() => {
        return records.filter((record) => {
            const q = search.toLowerCase();
            return (
                (record.roomCode || '').toLowerCase().includes(q) ||
                (record.title || record.quizTitle || '').toLowerCase().includes(q)
            );
        });
    }, [records, search]);

    const totalSessions = records.length;
    const totalParticipants = records.reduce((sum, record) => sum + (record.participantCount || 0), 0);
    const totalAnswers = records.reduce((sum, record) => sum + (record.totalAnswers || 0), 0);

    return (
        <div className={cx(layout.page, "app-page animate-in fade-in duration-500 pb-20")}>
            {/* Nav & Search Header */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
                <button
                    onClick={() => navigate(`/quiz/templates/${routeTemplateId}`)}
                    className="group flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-sm font-black uppercase tracking-widest theme-text-muted hover:theme-text-primary"
                >
                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-white/5 border theme-border flex items-center justify-center group-hover:-translate-x-1 transition-transform">
                        <ArrowLeft size={16} />
                    </div>
                    Return to Blueprint
                </button>
 
                <div className="relative group min-w-[320px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 theme-text-muted group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search sequence identity..."
                        className="w-full h-12 pl-12 pr-6 bg-white dark:bg-white/5 border-2 theme-border rounded-2xl text-sm font-bold theme-text-primary focus:border-indigo-500 outline-none transition-all"
                    />
                </div>
            </div>

            {/* Global Stats Overview */}
            <section className={`${components.analytics.card} !p-10 !rounded-[3rem] bg-gradient-to-br from-indigo-500/[0.02] to-purple-500/[0.02] border-2 border-indigo-500/10`}>
                <div className="flex flex-col lg:flex-row gap-12">
                    <div className="flex-1 space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                            <BarChart3 size={12} fill="currentColor" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Aggregate Performance Intel</span>
                        </div>
                        <h1 className="text-4xl font-black theme-text-primary tracking-tighter">{quizTitle}</h1>
                        <p className="text-sm font-bold theme-text-muted opacity-60 max-w-md leading-relaxed">
                            Comprehensive historical data for all broadcast sequences initiated from this template.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full lg:w-auto">
                        {[
                            { label: 'Active Sessions', value: totalSessions, icon: Activity, color: 'text-indigo-500' },
                            { label: 'Total Reach', value: totalParticipants, icon: Users, color: 'text-emerald-500' },
                            { label: 'Response Points', value: totalAnswers, icon: Trophy, color: 'text-amber-500' }
                        ].map((stat, i) => (
                            <div key={i} className="bg-white dark:bg-white/5 border theme-border rounded-[2rem] p-6 text-center space-y-3 shadow-xl shadow-indigo-500/5">
                                <div className={`w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/10 mx-auto flex items-center justify-center ${stat.color}`}>
                                    <stat.icon size={20} />
                                </div>
                                <div>
                                    <p className="text-2xl font-black theme-text-primary tabular-nums">{stat.value.toLocaleString()}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest theme-text-muted opacity-40">{stat.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Records Grid */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 ml-2">
                    <Layout size={18} className="text-indigo-500" />
                    <h3 className="text-lg font-black theme-text-primary tracking-tight uppercase">Session Archive</h3>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div key={`results-skeleton-${index}`} className={`${components.analytics.card} !p-8 !rounded-[2.5rem] space-y-6`}>
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2 w-full">
                                        <Skeleton className="h-6 w-32 rounded-lg" />
                                        <Skeleton className="h-4 w-48 rounded-lg" />
                                    </div>
                                    <Skeleton className="h-10 w-10 rounded-xl" />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <Skeleton className="h-20 rounded-2xl" />
                                    <Skeleton className="h-20 rounded-2xl" />
                                    <Skeleton className="h-20 rounded-2xl" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="py-24 text-center rounded-[3rem] bg-red-500/5 border-2 border-dashed border-red-500/20 space-y-4">
                        <Activity size={40} className="mx-auto text-red-300" />
                        <p className="text-sm font-black text-red-500 uppercase tracking-widest">{error}</p>
                    </div>
                ) : filteredRecords.length === 0 ? (
                    <div className="py-24 text-center rounded-[3rem] bg-gray-50 dark:bg-white/5 border-2 border-dashed theme-border space-y-4">
                        <Activity size={40} className="mx-auto text-slate-300 opacity-20" />
                        <p className="text-xs font-black uppercase tracking-widest theme-text-muted opacity-40">No archival records found for this sequence</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {filteredRecords.map((record, i) => (
                            <ViewportPrefetch key={record.roomCode} onPrefetch={() => prefetchHistoryDetailRoute().catch(() => { })}>
                                <Motion.button
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    onClick={() => navigate(`/quiz/templates/${routeTemplateId}/sessions/${record._id || record.roomCode || record.quizId}`, { state: { record } })}
                                    className={`${components.analytics.card} !p-8 !rounded-[2.5rem] text-left hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all group relative overflow-hidden`}
                                >
                                    <div className="flex items-start justify-between gap-4 mb-8">
                                        <div className="space-y-1">
                                            <p className="text-xl font-black theme-text-primary tracking-widest group-hover:text-indigo-500 transition-colors">{record.roomCode}</p>
                                            <p className="text-[10px] font-bold theme-text-muted uppercase tracking-widest opacity-60">
                                                {new Date(record.createdAt || record.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                            </p>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center theme-text-muted group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                            <ExternalLink size={18} />
                                        </div>
                                    </div>
 
                                    <div className="grid grid-cols-3 gap-3 text-center">
                                        {[
                                            { icon: Users, value: record.participantCount ?? 0, label: 'Users' },
                                            { icon: Trophy, value: record.totalAnswers ?? 0, label: 'Points' },
                                            { icon: Activity, value: record.status || 'Done', label: 'Status' }
                                        ].map((item, idx) => (
                                            <div key={idx} className="bg-gray-50/50 dark:bg-white/[0.02] border theme-border rounded-2xl py-4 px-1">
                                                <item.icon size={14} className="mx-auto text-indigo-500 opacity-60 mb-2" />
                                                <p className="text-sm font-black theme-text-primary truncate">{item.value}</p>
                                                <p className="text-[9px] font-black uppercase tracking-widest theme-text-muted opacity-40">{item.label}</p>
                                            </div>
                                        ))}
                                    </div>
 
                                    <div className="mt-8 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest theme-text-muted">Broadcast Artifact</span>
                                        </div>
                                        <ArrowRight size={14} className="text-indigo-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </Motion.button>
                            </ViewportPrefetch>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuizResultsPage;
