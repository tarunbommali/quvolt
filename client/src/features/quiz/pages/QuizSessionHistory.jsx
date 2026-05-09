/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/preserve-manual-memoization */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyScheduledJoins, isTransientApiError } from '../services/quiz.service';
import SearchBar from '../../../components/common/ui/SearchBar';
import HistoryErrorState from '../../host/components/HistoryErrorState';
import HistoryEmptyState from '../../host/components/HistoryEmptyState';
import HistoryNoResultsState from '../../host/components/HistoryNoResultsState';
import HistoryLeaderboardModal from '../../host/components/HistoryLeaderboardModal';
import HistoryGrid from '../../host/components/HistoryGrid';
import ScheduledSessionsSection from '../../host/components/ScheduledSessionsSection';
import SubHeader from '../../../components/layout/SubHeader';
import { prefetchHistoryDetailRoute } from '../../../utils/routePrefetch';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useQuizStore } from '../../../stores/useQuizStore';

const REQUEST_TIMEOUT_MS = 12000;

const withTimeout = (promise, ms = REQUEST_TIMEOUT_MS) =>
    Promise.race([
        promise,
        new Promise((_, reject) => {
            const timeoutId = window.setTimeout(() => {
                window.clearTimeout(timeoutId);
                reject(new Error('Request timed out'));
            }, ms);
        }),
    ]);

import usePaginatedFetch from '../../../hooks/usePaginatedFetch';
import Pagination from '../../../components/common/ui/Pagination';

const QuizSessionHistory = () => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const authLoading = useAuthStore((state) => state.loading);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [scheduledJoins, setScheduledJoins] = useState([]);
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
    const [subjectLeaderboard, setSubjectLeaderboard] = useState([]);
    const [leaderboardMeta, setLeaderboardMeta] = useState({ title: '', sub: '', accent: 'primary' });

    const {
        data: history,
        loading,
        error,
        pagination,
        page,
        setPage,
        limit,
        setLimit,
        setSearch,
        refetch
    } = usePaginatedFetch('/api/analytics/user/history', {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'desc'
    });

    useEffect(() => {
        const handler = setTimeout(() => {
            setSearch(searchQuery);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery, setSearch]);

    useEffect(() => {
        if (user?.role === 'participant') {
            getMyScheduledJoins().then(setScheduledJoins).catch(() => {});
        }
    }, [user?.role]);

    const openLeaderboard = async (e, record) => {
        e.stopPropagation();
        try {
            const qId = record.quizId || record.quiz?._id || record._id;
            if (!qId) return;
            const data = await useQuizStore.getState().getQuizLeaderboardCached(qId);
            setSubjectLeaderboard(data);
            setLeaderboardMeta({
                title: record.quizTitle || record.title || 'Quiz Standings',
                sub: 'Top Performers',
                accent: 'primary',
            });
            setIsLeaderboardOpen(true);
        } catch (err) {}
    };

    const prefetchHistoryNavigation = useCallback((record) => {
        prefetchHistoryDetailRoute().catch(() => { });
        const qId = record?.quizId || record?.quiz?._id || record?._id;
        if (qId) useQuizStore.getState().prefetchQuizLeaderboard(qId).catch(() => { });
    }, []);

    if (authLoading || (loading && history.length === 0)) return null;

    if (error) {
        return <HistoryErrorState error={error} onRetry={fetchHistory} />;
    }

    return (
        <div className="app-page space-y-8 animate-in fade-in duration-500">
            <SubHeader
                title="History"
                subtitle={user.role === 'host' ? 'Archive of your conducted sessions' : 'Recap of your quiz performances'}
                breadcrumbs={[{ label: user.role === 'host' ? 'Studio' : 'Join', href: user.role === 'host' ? '/studio' : '/join' }, { label: 'History' }]}
                actions={(
                    <SearchBar
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by title or code..."
                        className="w-full md:w-96"
                    />
                )}
            />

            {user.role === 'participant' && scheduledJoins.length > 0 && (
                <ScheduledSessionsSection
                    sessions={scheduledJoins}
                    onJoin={(session) => navigate(`/quiz/${session.roomCode}`)}
                />
            )}


            {history.length === 0 ? (
                <HistoryEmptyState />
            ) : (
                <div className="relative">
                    {loading && history.length > 0 && (
                        <div className="absolute inset-0 z-10 bg-white/20 backdrop-blur-[1px] dark:bg-black/20" />
                    )}
                    <HistoryGrid
                        records={history}
                        userRole={user.role}
                        onNavigate={(record) => navigate(`/quiz/sessions/${record._id || record.roomCode || record.quizId}`, { state: { record } })}
                        onOpenLeaderboard={openLeaderboard}
                        onPrefetch={prefetchHistoryNavigation}
                    />
                </div>
            )}

            {pagination && (
                <Pagination 
                    pagination={pagination}
                    onPageChange={setPage}
                    onLimitChange={setLimit}
                />
            )}

            <HistoryLeaderboardModal
                open={isLeaderboardOpen}
                leaderboard={subjectLeaderboard}
                meta={leaderboardMeta}
                onClose={() => setIsLeaderboardOpen(false)}
            />
        </div>
    );
};

export default QuizSessionHistory;

