/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/preserve-manual-memoization */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyScheduledJoins, isTransientApiError } from '../../services/api';
import SearchBar from '../../components/ui/SearchBar';
import HistoryErrorState from '../../components/history/HistoryErrorState';
import HistoryEmptyState from '../../components/history/HistoryEmptyState';
import HistoryNoResultsState from '../../components/history/HistoryNoResultsState';
import HistoryLeaderboardModal from '../../components/history/HistoryLeaderboardModal';
import HistoryGrid from '../../components/history/HistoryGrid';
import ScheduledSessionsSection from '../../components/history/ScheduledSessionsSection';
import SubHeader from '../../components/layout/SubHeader';
import { prefetchHistoryDetailRoute } from '../../utils/routePrefetch';
import { useAuthStore } from '../../stores/useAuthStore';
import { useQuizStore } from '../../stores/useQuizStore';

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

const HostHistoryPage = () => {
    const [history, setHistory] = useState([]);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [scheduledJoins, setScheduledJoins] = useState([]);
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
    const [subjectLeaderboard, setSubjectLeaderboard] = useState([]);
    const [leaderboardMeta, setLeaderboardMeta] = useState({ title: '', sub: '', accent: 'primary' });

    const user = useAuthStore((state) => state.user);
    const authLoading = useAuthStore((state) => state.loading);
    const navigate = useNavigate();

    const fetchHistory = useCallback(async () => {
        if (authLoading || !user?.role) return undefined;

        let active = true;
        try {
            setError(null);

            const data = await withTimeout(useQuizStore.getState().getHistoryForRole(user.role));
            if (!active) return undefined;
            setHistory(data);

            if (user.role === 'participant') {
                const joined = await withTimeout(getMyScheduledJoins());
                if (!active) return undefined;
                setScheduledJoins(joined);
            } else {
                setScheduledJoins([]);
            }
        } catch {
            if (active) setError('Failed to load history. Please try again.');
        }

        return () => {
            active = false;
        };
    }, [authLoading, user?.role]);

    const openLeaderboard = async (e, record) => {
        e.stopPropagation();
        try {
            const qId = record.quizId || record.quiz?._id || record._id;
            if (!qId) {
                setError('Cannot fetch standings for this record.');
                return;
            }

            const data = await withTimeout(useQuizStore.getState().getQuizLeaderboardCached(qId));
            setSubjectLeaderboard(data);
            setLeaderboardMeta({
                title: record.quizTitle || record.title || 'Quiz Standings',
                sub: 'Top Performers',
                accent: 'primary',
            });
            setIsLeaderboardOpen(true);
        } catch (err) {
            setError(
                isTransientApiError(err)
                    ? 'Temporary network issue. Standings request failed after retries.'
                    : 'Failed to fetch standings. Please try again.',
            );
        }
    };

    const prefetchHistoryNavigation = useCallback((record) => {
        prefetchHistoryDetailRoute().catch(() => { });
        useQuizStore.getState().prefetchHistoryForRole(user.role).catch(() => { });
        const qId = record?.quizId || record?.quiz?._id || record?._id;
        if (qId) {
            useQuizStore.getState().prefetchQuizLeaderboard(qId).catch(() => { });
        }
    }, [user?.role]);

    useEffect(() => {
        if (authLoading || !user?.role) return undefined;

        const cleanup = fetchHistory();
        return () => {
            if (cleanup && typeof cleanup.then === 'function') {
                cleanup.then((fn) => typeof fn === 'function' && fn());
            } else if (typeof cleanup === 'function') {
                cleanup();
            }
        };
    }, [authLoading, user?.role, fetchHistory]);

    useEffect(() => {
        if (authLoading || !user?.role) return undefined;

        const refresh = () => {
            fetchHistory();
        };

        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refresh();
            }
        };

        window.addEventListener('focus', refresh);
        document.addEventListener('visibilitychange', onVisibilityChange);
        const intervalId = window.setInterval(refresh, 30000);

        return () => {
            window.removeEventListener('focus', refresh);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.clearInterval(intervalId);
        };
    }, [authLoading, fetchHistory, user?.role]);

    const searchFilteredHistory = history.filter((record) =>
        (record.title || record.quizTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (record.roomCode || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredHistory = searchFilteredHistory;

    if (error) {
        return <HistoryErrorState error={error} onRetry={fetchHistory} />;
    }

    return (
        <div className="app-page space-y-8 animate-in fade-in duration-500">
            <SubHeader
                title="History"
                subtitle={user.role === 'host' ? 'Archive of your conducted sessions' : 'Recap of your quiz performances'}
                breadcrumbs={[{ label: 'Dashboard', href: user.role === 'host' ? '/studio' : '/join' }, { label: 'History' }]}
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
            ) : filteredHistory.length === 0 ? (
                <HistoryNoResultsState />
            ) : (
                <HistoryGrid
                    records={filteredHistory}
                    userRole={user.role}
                    onNavigate={(record) => navigate(`/quiz/sessions/${record._id || record.roomCode || record.quizId}`, { state: { record } })}
                    onOpenLeaderboard={openLeaderboard}
                    onPrefetch={prefetchHistoryNavigation}
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

export default HostHistoryPage;
