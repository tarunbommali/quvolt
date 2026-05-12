/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/preserve-manual-memoization */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { getMyScheduledJoins, isTransientApiError } from '../services/host.service';
import HistoryErrorState from '../components/HistoryErrorState';
import HistoryEmptyState from '../components/HistoryEmptyState';
import HistoryNoResultsState from '../components/HistoryNoResultsState';
import HistoryLeaderboardModal from '../components/HistoryLeaderboardModal';
import HistoryGrid from '../components/HistoryGrid';
import ScheduledSessionsSection from '../components/ScheduledSessionsSection';
import PageHeader from '../../../components/layout/PageHeader';
import LoadingScreen from '../../../components/common/LoadingScreen';
import { prefetchHistoryDetailRoute } from '../../../utils/routePrefetch';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useQuizStore } from '../../../stores/useQuizStore';

import { Search, Calendar, Database } from 'lucide-react';
import { textStyles, components, layout, typography, forms, cx } from '../../../styles/index';

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

const SessionHistoryPage = () => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const authLoading = useAuthStore((state) => state.loading);

    const [searchQuery, setSearchQuery] = useState('');
    const [scheduledJoins, setScheduledJoins] = useState([]);
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
    const [subjectLeaderboard, setSubjectLeaderboard] = useState([]);
    const [leaderboardMeta, setLeaderboardMeta] = useState({ title: '', sub: '', accent: 'primary' });

    const endpoint = user?.role === 'host' ? '/api/analytics/host/stats' : '/api/analytics/user/history';

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
    } = usePaginatedFetch(endpoint, {
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
            getMyScheduledJoins().then(setScheduledJoins).catch(() => { });
        }
    }, [user?.role]);

    React.useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [page]);

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
        } catch (err) { }
    };

    const prefetchHistoryNavigation = useCallback((record) => {
        prefetchHistoryDetailRoute().catch(() => { });
        const qId = record?.quizId || record?.quiz?._id || record?._id;
        if (qId) useQuizStore.getState().prefetchQuizLeaderboard(qId).catch(() => { });
    }, []);

    if (authLoading || (loading && history.length === 0)) return <LoadingScreen />;

    return (
        <div className={cx(layout.page, 'min-h-screen')}>
            <PageHeader
                breadcrumbs={[{ label: 'Workspace', href: user.role === 'host' ? '/workspace' : '/join' }, { label: 'Activity' }]}

            />

            {error && (
                <HistoryErrorState error={error} onRetry={refetch} />
            )}

            {!error && (
                <div className={layout.sectionLg}>
                    {user.role === 'participant' && scheduledJoins.length > 0 && (
                        <section className={layout.section}>
                            <div className={layout.rowBetween}>
                                <div className={layout.rowStart}>
                                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                        <Calendar size={15} />
                                    </div>
                                    <h2 className={typography.h2}>Scheduled Sessions</h2>
                                </div>
                                <span className="text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 px-2.5 py-1 rounded-full">
                                    Action Required
                                </span>
                            </div>
                            <ScheduledSessionsSection
                                sessions={scheduledJoins}
                                onJoin={(session) => navigate(`/quiz/${session.roomCode}`)}
                            />
                        </section>
                    )}

                    <section className={layout.section}>
                        <div className={layout.rowBetween}>

                            <span className={typography.metaLabel}>
                                {pagination?.total || history.length} session{(pagination?.total || history.length) !== 1 ? 's' : ''}
                            </span>
                        </div>

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
                                    onNavigate={(record) => navigate(`/history/${record.sessionId || record._id || record.roomCode}`)}
                                    onOpenLeaderboard={openLeaderboard}
                                    onPrefetch={prefetchHistoryNavigation}
                                />
                            </div>
                        )}

                        {pagination && pagination.total > 10 && (
                            <Pagination
                                pagination={pagination}
                                onPageChange={setPage}
                                onLimitChange={setLimit}
                            />
                        )}
                    </section>
                </div>
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

export default SessionHistoryPage;
