import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAnalyticsStore from '../../../stores/useAnalyticsStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { getSocket } from '../../../sockets/socketClient';

import SubHeader from '../../../components/layout/SubHeader';
import { ArrowLeft, ArrowRight, ExternalLink, Lock } from 'lucide-react';

import AnalyticsTierGuard from '../../analytics/components/AnalyticsTierGuard';
import BasicSessionAnalytics from '../../analytics/components/BasicSessionAnalytics';
import QuestionInsights from '../../analytics/components/QuestionInsights';
import AudienceInsights from '../../analytics/components/AudienceInsights';
import AnalyticsSkeleton from '../../analytics/components/AnalyticsSkeleton';
import EmptyAnalyticsState, { AnalyticsErrorState } from '../../analytics/components/EmptyAnalyticsState';

const SectionBadge = ({ label, colorClass }) => (
    <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${colorClass}`}>
        {label}
    </span>
);

const SessionDetailPage = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();

    const user = useAuthStore((state) => state.user);
    const userTier = (user?.subscription?.plan || user?.plan || 'FREE').toUpperCase();

    const {
        activeSessionId,
        setActiveSession,
        analyticsLoading,
        analyticsError,
        sessionAnalytics,
        questionInsights,
        audienceInsights,
        activePlan,
        liveParticipantCount,
        fetchFullAnalytics,
        subscribeToRealtimeUpdates,
        recentSessions,
        fetchRecentSessions,
    } = useAnalyticsStore();

    // ── Bootstrap ─────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!recentSessions.length) {
            fetchRecentSessions(20);
        }
    }, [recentSessions.length, fetchRecentSessions]);

    useEffect(() => {
        if (sessionId && sessionId !== activeSessionId) {
            setActiveSession(sessionId);
        }
    }, [sessionId, activeSessionId, setActiveSession]);

    useEffect(() => {
        const socket = getSocket();
        const cleanup = subscribeToRealtimeUpdates(socket);
        return cleanup;
    }, [subscribeToRealtimeUpdates]);

    useEffect(() => {
        if (!sessionId) return;
        fetchFullAnalytics(sessionId);
    }, [sessionId, fetchFullAnalytics]);

    // ── Render States ─────────────────────────────────────────────────────────

    const handleBack = () => navigate('/history');

    if (analyticsLoading) {
        return (
            <div className="max-w-7xl mx-auto px-6 py-8 w-full">
                <AnalyticsSkeleton />
            </div>
        );
    }

    if (analyticsError) {
        const errLower = analyticsError.toLowerCase();
        const isUnauthorized = errLower.includes('unauthorized') || errLower.includes('access denied') || errLower.includes('403');
        const isNotFound = errLower.includes('not found') || errLower.includes('404');

        let title = "Failed to load analytics";
        let message = analyticsError;
        let ctaText = "Try Again";
        let onCtaClick = () => fetchFullAnalytics(sessionId);
        let icon = undefined;

        if (isUnauthorized) {
            title = "Access Denied";
            message = "You don't have access to this session. It might belong to another host or organization.";
            icon = Lock;
            ctaText = "Go back to History";
            onCtaClick = handleBack;
        } else if (isNotFound) {
            title = "Session Not Found";
            message = "This session either doesn't exist or has been deleted.";
            ctaText = "Go back to History";
            onCtaClick = handleBack;
        }

        return (
            <div className="max-w-7xl mx-auto px-6 py-20 w-full">
                <AnalyticsErrorState
                    title={title}
                    message={message}
                    icon={icon}
                    onRetry={onCtaClick}
                    retryLabel={ctaText}
                />
            </div>
        );
    }

    const currentIndex = recentSessions.findIndex(s => s.sessionId === sessionId);
    const prevSession = currentIndex > -1 && currentIndex < recentSessions.length - 1 ? recentSessions[currentIndex + 1] : null;
    const nextSession = currentIndex > 0 ? recentSessions[currentIndex - 1] : null;
    const activeMeta = currentIndex > -1 ? recentSessions[currentIndex] : {};

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 pb-24 space-y-10">
            {/* Header Toolbar */}
            <SubHeader
                title={activeMeta.title || 'Session Analytics'}
                subtitle={`Session: ${activeMeta.sessionCode || '---'} • ${activeMeta.startedAt ? new Date(activeMeta.startedAt).toLocaleString() : ''}`}
                breadcrumbs={[
                    { label: 'HISTORY', href: '/history' },
                    { label: 'Session Details' }
                ]}
            />

            {/* SECTION 1 — Session Summary (all tiers) */}
            <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-black theme-text-primary tracking-tight">Overview</h2>
                        <p className="text-xs font-semibold theme-text-muted uppercase tracking-wider">Core Performance Metrics</p>
                    </div>
                    <SectionBadge label="Live Visibility" colorClass="bg-emerald-500/10 text-emerald-500" />
                </div>
                <BasicSessionAnalytics
                    summary={sessionAnalytics || {}}
                    leaderboard={sessionAnalytics?.topLeaderboard || []}
                />
            </section>

            {/* SECTION 2 — Audience Insights (Creator+) */}
            <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-black theme-text-primary tracking-tight">Audience & Engagement</h2>
                        <p className="text-xs font-semibold theme-text-muted uppercase tracking-wider">Participant Demographics & Behavior</p>
                    </div>
                    <SectionBadge label="Actionable Insights" colorClass="bg-indigo-500/10 text-indigo-500" />
                </div>
                <AnalyticsTierGuard userTier={userTier} requiredTier="CREATOR" featureName="Audience Insights">
                    {audienceInsights === null && activePlan === 'FREE' ? (
                        null
                    ) : (
                        <AudienceInsights data={audienceInsights || {}} />
                    )}
                </AnalyticsTierGuard>
            </section>

            {/* SECTION 3 — Question Intelligence (Creator+) */}
            <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-black theme-text-primary tracking-tight">Question Intelligence</h2>
                        <p className="text-xs font-semibold theme-text-muted uppercase tracking-wider">Individual Question Deep-Dive</p>
                    </div>
                    <SectionBadge label="Optimization" colorClass="bg-amber-500/10 text-amber-500" />
                </div>
                <AnalyticsTierGuard userTier={userTier} requiredTier="CREATOR" featureName="Question-Level Analytics">
                    {questionInsights === null && activePlan === 'FREE' ? (
                        null
                    ) : (
                        <QuestionInsights
                            stats={questionInsights?.questions || []}
                            summary={questionInsights?.summary || {}}
                        />
                    )}
                </AnalyticsTierGuard>
            </section>

            {/* SECTION 4 — Organization Dashboard (Teams+) */}
            <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-black theme-text-primary tracking-tight">Organization Export</h2>
                        <p className="text-xs font-semibold theme-text-muted uppercase tracking-wider">Enterprise Reporting & Compliance</p>
                    </div>
                    <SectionBadge label="Enterprise Intelligence" colorClass="bg-purple-500/10 text-purple-500" />
                </div>
                <AnalyticsTierGuard userTier={userTier} requiredTier="TEAMS" featureName="Multi-Host Reporting">
                    <div className="theme-surface border border-dashed theme-border p-12 rounded-[2.5rem] flex flex-col items-center text-center space-y-4 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500">
                            <ExternalLink size={28} />
                        </div>
                        <div className="space-y-2 relative z-10">
                            <h4 className="text-lg font-bold theme-text-primary">Advanced Data Exports</h4>
                            <p className="text-sm font-medium theme-text-muted max-w-sm">
                                CSV, PDF, and automated email reporting for your entire organization. Coming soon to the Teams plan.
                            </p>
                        </div>
                    </div>
                </AnalyticsTierGuard>
            </section>
        </div>
    );
};

export default SessionDetailPage;
