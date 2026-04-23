import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Users, Trophy, Clock, ExternalLink, Search } from 'lucide-react';
import { useQuizStore } from '../../../stores/useQuizStore';
import { isTransientApiError } from '../services/quiz.service';
import Skeleton from '../../../components/common/ui/Skeleton';
import ViewportPrefetch from '../../../components/common/ViewportPrefetch';
import { prefetchHistoryDetailRoute } from '../../../utils/routePrefetch';
import { textStyles } from '../../../styles/index';

const QuizSessionResult = () => {
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
        <div className="app-page space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <button
                    onClick={() => navigate(`/quiz/templates/${routeTemplateId}`)}
                    className="flex items-center gap-2 font-semibold text-slate-500 transition-colors hover:text-indigo-600"
                >
                    <ArrowLeft size={18} /> Back to Edit
                </button>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by room code..."
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-indigo-500 transition-colors shadow-sm placeholder:text-slate-400 placeholder:font-medium"
                    />
                </div>
            </div>

            <div className="bg-white border border-gray-100 shadow-sm rounded-4xl p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-gray-100 pb-6">
                    <div className="page-header">
                        <p className={textStyles.overline + ' text-indigo-600'}>Quiz Results</p>
                        <h1 className="page-title mt-2">{quizTitle}</h1>
                        <p className="page-subtitle">All previous attempts for this quiz.</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
                        <div className="bg-gray-50 rounded-2xl px-4 py-3 text-center border border-gray-100">
                            <p className={textStyles.overline + ' text-slate-400'}>Sessions</p>
                            <p className="text-xl font-semibold tracking-tight text-slate-900">{totalSessions}</p>
                        </div>
                        <div className="bg-gray-50 rounded-2xl px-4 py-3 text-center border border-gray-100">
                            <p className={textStyles.overline + ' text-slate-400'}>Participants</p>
                            <p className="text-xl font-semibold tracking-tight text-slate-900">{totalParticipants}</p>
                        </div>
                        <div className="bg-gray-50 rounded-2xl px-4 py-3 text-center border border-gray-100">
                            <p className={textStyles.overline + ' text-slate-400'}>Answers</p>
                            <p className="text-xl font-semibold tracking-tight text-slate-900">{totalAnswers}</p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div key={`results-skeleton-${index}`} className="bg-gray-50 border border-gray-100 rounded-3xl p-5 space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-2 w-full">
                                        <Skeleton className="h-6 w-24" />
                                        <Skeleton className="h-4 w-2/3" />
                                    </div>
                                    <Skeleton className="h-4 w-4" />
                                </div>

                                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                                    <Skeleton className="h-20 w-full rounded-xl" />
                                    <Skeleton className="h-20 w-full rounded-xl" />
                                    <Skeleton className="h-20 w-full rounded-xl" />
                                </div>

                                <Skeleton className="h-4 w-32" />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="py-16 text-center text-sm font-semibold text-red-500">{error}</div>
                ) : filteredRecords.length === 0 ? (
                    <div className="py-16 text-center text-sm font-medium text-slate-400">No previous attempts found for this quiz.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {filteredRecords.map((record) => (
                            <ViewportPrefetch key={record.roomCode} onPrefetch={() => prefetchHistoryDetailRoute().catch(() => { })}>
                                <button
                                    onClick={() => navigate(`/quiz/templates/${routeTemplateId}/sessions/${record._id || record.roomCode || record.quizId}`, { state: { record } })}
                                    onMouseEnter={() => prefetchHistoryDetailRoute().catch(() => { })}
                                    onFocus={() => prefetchHistoryDetailRoute().catch(() => { })}
                                    className="text-left bg-gray-50 hover:bg-white border border-gray-100 hover:border-indigo-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-base font-semibold tracking-tight text-slate-900">{record.roomCode}</p>
                                            <p className={textStyles.overline + ' mt-1 text-slate-400'}>
                                                {new Date(record.createdAt || record.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                            </p>
                                        </div>
                                        <ExternalLink size={16} className="text-slate-400 shrink-0 mt-1" />
                                    </div>

                                    <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                                        <div className="bg-white rounded-xl border border-gray-100 py-3">
                                            <Users size={16} className="mx-auto text-indigo-600" />
                                            <p className="mt-1 text-sm font-semibold text-slate-900">{record.participantCount ?? 0}</p>
                                            <p className={textStyles.overline + ' text-slate-400'}>Users</p>
                                        </div>
                                        <div className="bg-white rounded-xl border border-gray-100 py-3">
                                            <Trophy size={16} className="mx-auto text-indigo-600" />
                                            <p className="mt-1 text-sm font-semibold text-slate-900">{record.totalAnswers ?? 0}</p>
                                            <p className={textStyles.overline + ' text-slate-400'}>Answers</p>
                                        </div>
                                        <div className="bg-white rounded-xl border border-gray-100 py-3">
                                            <Clock size={16} className="mx-auto text-indigo-600" />
                                            <p className="mt-1 text-sm font-semibold text-slate-900">{record.status || 'completed'}</p>
                                            <p className={textStyles.overline + ' text-slate-400'}>Status</p>
                                        </div>
                                    </div>

                                    <div className={`${textStyles.overline} mt-4 flex items-center gap-2 text-slate-500`}>
                                        <Calendar size={14} className="text-indigo-500" />
                                        Previous Attempt
                                    </div>
                                </button>
                            </ViewportPrefetch>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuizSessionResult;

