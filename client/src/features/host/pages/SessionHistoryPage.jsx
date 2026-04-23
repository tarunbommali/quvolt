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
import SubHeader from '../../../components/layout/SubHeader';
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

const SessionHistoryPage = () => {
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
            }
        } catch {
            if (active) setError('Failed to load history. Please try again.');
        }
        return () => { active = false; };
    }, [authLoading, user?.role]);

    const openLeaderboard = async (e, record) => {
        e.stopPropagation();
        try {
            const qId = record.quizId || record.quiz?._id || record._id;
            if (!qId) return setError('Cannot fetch standings for this record.');
            const data = await withTimeout(useQuizStore.getState().getQuizLeaderboardCached(qId));
            setSubjectLeaderboard(data);
            setLeaderboardMeta({
                title: record.quizTitle || record.title || 'Quiz Standings',
                sub: 'Top Performers',
                accent: 'primary',
            });
            setIsLeaderboardOpen(true);
        } catch (err) {
            setError(isTransientApiError(err) ? 'Temporary network issue.' : 'Failed to fetch standings.');
        }
    };

    const prefetchHistoryNavigation = useCallback((record) => {
        prefetchHistoryDetailRoute().catch(() => { });
        useQuizStore.getState().prefetchHistoryForRole(user.role).catch(() => { });
        const qId = record?.quizId || record?.quiz?._id || record?._id;
        if (qId) useQuizStore.getState().prefetchQuizLeaderboard(qId).catch(() => { });
    }, [user?.role]);

    useEffect(() => {
        if (authLoading || !user?.role) return;
        fetchHistory();
    }, [authLoading, user?.role, fetchHistory]);

    const filteredHistory = history.filter((record) =>
        (record.title || record.quizTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (record.roomCode || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cx(layout.page, "min-h-screen pb-24")}
        >
            <SubHeader
                title="Activity Journal"
                subtitle={user.role === 'host' ? 'A record of your conducted sessions and performance metrics.' : 'Your learning history and achievement vault.'}
                breadcrumbs={[{ label: 'Studio', href: user.role === 'host' ? '/studio' : '/join' }, { label: 'Activity' }]}
                actions={(
                    <div className={cx(forms.searchWrap, 'w-full md:w-80')}>
                        <div className={cx(forms.searchIcon)}>
                            <Search size={15} />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search sessions…"
                            className={cx(forms.inputField, 'pl-9')}
                        />
                    </div>
                )}
            />

            {error && (
                <HistoryErrorState error={error} onRetry={fetchHistory} />
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
                            <div className={layout.rowStart}>
                                <div className="w-7 h-7 rounded-lg bg-[var(--qb-primary)]/10 text-[var(--qb-primary)] flex items-center justify-center">
                                    <Database size={15} />
                                </div>
                                <h2 className={typography.h2}>Session Archive</h2>
                            </div>
                            <span className={typography.metaLabel}>
                                {filteredHistory.length} session{filteredHistory.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {history.length === 0 ? (
                            <HistoryEmptyState />
                        ) : filteredHistory.length === 0 ? (
                            <HistoryNoResultsState />
                        ) : (
                            <HistoryGrid
                                records={filteredHistory}
                                userRole={user.role}
                                onNavigate={(record) => navigate(`/history/${record.sessionId || record._id || record.roomCode}`)}
                                onOpenLeaderboard={openLeaderboard}
                                onPrefetch={prefetchHistoryNavigation}
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
        </Motion.div>
    );
};

export default SessionHistoryPage;
