import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Download, CheckCircle2, XCircle } from 'lucide-react';
import { getQuizAnalytics, getSessionParticipants } from '../services/api';
import { useAuthStore } from '../stores/useAuthStore';
import { useQuizStore } from '../stores/useQuizStore';
import SubHeader from '../components/layout/SubHeader';

const HistoryDetail = () => {
    const { id, quizid } = useParams();
    const routeId = quizid || id;
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
                        return rowQuizId === String(routeId)
                            || rowRoomCode === String(routeId)
                            || rowId === String(routeId);
                    }) || null;
                }

                if (!record) {
                    if (active) navigate('/history');
                    return;
                }

                if (active) setSelectedQuiz(record);
            } finally {
                if (active) setLoading(false);
            }
        };

        loadRecord().catch(() => {
            if (active) {
                setLoading(false);
                navigate('/history');
            }
        });

        return () => {
            active = false;
        };
    }, [getHistoryForRole, location.state?.record, navigate, routeId, user?.role]);

    useEffect(() => {
        let active = true;

        const loadOrganizerDetails = async () => {
            if (!selectedQuiz || user?.role !== 'organizer') return;

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
                setParticipantCount(
                    participantsData?.participantCount
                    ?? analyticsData?.summary?.participantCount
                    ?? selectedQuiz.participantCount
                    ?? 0,
                );
            } catch {
                if (!active) return;
                setAnalytics(null);
                setLeaderboard([]);
                setJoinedParticipants([]);
                setParticipantCount(selectedQuiz.participantCount ?? 0);
            }
        };

        loadOrganizerDetails();

        return () => {
            active = false;
        };
    }, [getQuizLeaderboardCached, selectedQuiz, user?.role]);

    if (loading) {
        return (
            <div className="app-page">
                <div className="rounded-3xl border border-gray-100 bg-white p-8 text-center text-sm font-semibold text-slate-500">
                    Loading session analytics...
                </div>
            </div>
        );
    }

    if (!selectedQuiz) return null;
    const totalParticipants = participantCount ?? selectedQuiz.participantCount ?? analytics?.summary?.participantCount ?? 0;
    const totalAnswers = selectedQuiz.totalAnswers ?? analytics?.summary?.totalAnswers ?? 0;
    const avgAnswers = totalParticipants && totalAnswers
        ? (totalAnswers / totalParticipants).toFixed(1)
        : '—';
    const participantTotalScore = (selectedQuiz.answers || []).reduce((acc, ans) => acc + (Number(ans.score) || 0), 0);
    const participantTotalTime = Number(selectedQuiz.totalTime || 0).toFixed(1);
    const sessionTimeLabel = new Date(selectedQuiz.createdAt || selectedQuiz.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    const statusLabel = String(selectedQuiz.status || 'completed');
    const normalizedStatus = statusLabel.toLowerCase();
    const statusBadgeClass = normalizedStatus === 'completed'
        ? 'bg-emerald-50 text-emerald-600'
        : normalizedStatus === 'live'
            ? 'bg-indigo-50 text-indigo-600'
            : normalizedStatus === 'waiting'
                ? 'bg-amber-50 text-amber-600'
                : 'bg-gray-100 text-gray-600';

    const exportToCSV = (record) => {
        const isOrganizer = user.role === 'organizer';
        let csvContent = '';

        if (isOrganizer) {
            csvContent = 'Quiz Title,Room Code,Date,Participants,Total Answers\n';
            csvContent += `"${record.title}",${record.roomCode},${new Date(record.createdAt).toLocaleDateString()},${record.participantCount},${record.totalAnswers}\n`;
        } else {
            csvContent = 'Question,Your Answer,Correct,Points\n';
            (record.answers || []).forEach(ans => {
                csvContent += `"${ans.questionText}","${ans.selected}",${ans.isCorrect},${ans.score}\n`;
            });
        }

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
        <div className="app-page space-y-6 animate-in fade-in duration-500">
            <SubHeader
                title={selectedQuiz.quizTitle || selectedQuiz.title || 'Session'}
                subtitle="Session analytics and results"
                breadcrumbs={[{ label: 'History', href: '/history' }, { label: 'Session' }]}
                actions={(
                    <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusBadgeClass}`}>
                            {statusLabel}
                        </span>
                        <button
                            type="button"
                            onClick={() => exportToCSV(selectedQuiz)}
                            className="inline-flex h-9 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        >
                            <Download size={14} /> Export CSV
                        </button>
                    </div>
                )}
            />

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-1">
                    <p className="text-xs text-gray-400 uppercase">Participants</p>
                    <p className="text-lg font-semibold text-gray-900">{totalParticipants}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-1">
                    <p className="text-xs text-gray-400 uppercase">Answers</p>
                    <p className="text-lg font-semibold text-gray-900">{totalAnswers}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-1">
                    <p className="text-xs text-gray-400 uppercase">Session Time</p>
                    <p className="text-lg font-semibold text-gray-900">{sessionTimeLabel}</p>
                </div>
            </section>

            {user.role === 'participant' ? (
                <div className="space-y-4">
                    <section className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-gray-700">Answer Breakdown</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left border-b border-gray-200">
                                        <th className="py-2 pr-3 text-xs text-gray-400 uppercase font-semibold">Question</th>
                                        <th className="py-2 pr-3 text-xs text-gray-400 uppercase font-semibold">Your Answer</th>
                                        <th className="py-2 pr-3 text-xs text-gray-400 uppercase font-semibold">Result</th>
                                        <th className="py-2 text-xs text-gray-400 uppercase font-semibold">Points</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!selectedQuiz.answers?.length ? (
                                        <tr>
                                            <td colSpan={4} className="pt-3">
                                                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-500">
                                                    No answer records available for this session.
                                                </div>
                                            </td>
                                        </tr>
                                    ) : selectedQuiz.answers.map((ans, idx) => (
                                        <tr key={idx} className="border-b border-gray-100 last:border-b-0">
                                            <td className="py-2 pr-3 text-gray-900 font-medium max-w-90 truncate" title={ans.questionText}>{ans.questionText}</td>
                                            <td className="py-2 pr-3 text-gray-700">{ans.selected || '—'}</td>
                                            <td className="py-2 pr-3 text-gray-700">
                                                <span className={`inline-flex items-center gap-1 ${ans.isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {ans.isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                                    {ans.isCorrect ? 'Correct' : 'Wrong'}
                                                </span>
                                            </td>
                                            <td className="py-2 text-gray-900">{ans.score ?? 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-gray-700">Additional Insights</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 rounded-lg p-3 text-sm">
                                <p className="text-xs text-gray-400 uppercase">Total Score</p>
                                <p className="text-sm font-semibold text-gray-900">{participantTotalScore}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 text-sm">
                                <p className="text-xs text-gray-400 uppercase">Total Time</p>
                                <p className="text-sm font-semibold text-gray-900">{participantTotalTime}s</p>
                            </div>
                        </div>
                    </section>
                </div>
            ) : (
                <div className="space-y-4">
                    <section className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-gray-700">Who Joined</h3>
                        {joinedParticipants.length === 0 ? (
                            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-500">
                                No participants joined this session.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {joinedParticipants.map((entry, index) => (
                                    <div key={`${entry.userId || entry.name}-${index}`} className="rounded-lg border border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{entry.name || 'Unknown User'}</p>
                                            <p className="text-xs text-gray-500">{entry.email || 'No email'}</p>
                                        </div>
                                        <p className="text-xs font-semibold text-gray-600">Rank #{entry.rank || index + 1}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-gray-700">Leaderboard</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left border-b border-gray-200">
                                        <th className="py-2 pr-3 text-xs text-gray-400 uppercase font-semibold">Rank</th>
                                        <th className="py-2 pr-3 text-xs text-gray-400 uppercase font-semibold">Name</th>
                                        <th className="py-2 pr-3 text-xs text-gray-400 uppercase font-semibold">Score</th>
                                        <th className="py-2 text-xs text-gray-400 uppercase font-semibold">Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaderboard.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="pt-3">
                                                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-500">
                                                    Leaderboard is not available yet.
                                                </div>
                                            </td>
                                        </tr>
                                    ) : leaderboard.map((entry, index) => (
                                        <tr key={`${entry.name}-${index}`} className="border-b border-gray-100 last:border-b-0">
                                            <td className="py-2 pr-3 text-gray-700">#{index + 1}</td>
                                            <td className="py-2 pr-3 text-gray-900 font-medium">{entry.name}</td>
                                            <td className="py-2 pr-3 text-gray-900">{entry.score ?? 0}</td>
                                            <td className="py-2 text-gray-600">{Number(entry.time || 0).toFixed(2)}s</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-gray-700">MCQ Question Stats</h3>
                        {!Array.isArray(analytics?.questionStats) || analytics.questionStats.length === 0 ? (
                            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-500">
                                Question-level analytics are not available yet for this quiz.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {analytics.questionStats.map((question) => (
                                    <div key={question.questionId} className="rounded-lg border border-gray-200 bg-white px-4 py-3 space-y-2">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-xs text-gray-400 uppercase">Q{question.index || '—'}</p>
                                                <p className="text-sm font-semibold text-gray-900 truncate" title={question.text}>{question.text}</p>
                                            </div>
                                            <p className="text-xs font-semibold text-gray-700 shrink-0">{question.successRate ?? 0}% correct</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-xs text-gray-400 uppercase">Attempts</p>
                                                <p className="text-sm font-semibold text-gray-900">{question.total ?? 0}</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-xs text-gray-400 uppercase">Avg Time</p>
                                                <p className="text-sm font-semibold text-gray-900">{Number(question.avgTime || 0).toFixed(2)}s</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-gray-700">Additional Insights</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 rounded-lg p-3 text-sm">
                                <p className="text-xs text-gray-400 uppercase">Room Code</p>
                                <p className="text-sm font-semibold text-gray-900">{selectedQuiz.roomCode || '—'}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 text-sm">
                                <p className="text-xs text-gray-400 uppercase">Avg Answers / Participant</p>
                                <p className="text-sm font-semibold text-gray-900">{avgAnswers}</p>
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
};

export default HistoryDetail;
