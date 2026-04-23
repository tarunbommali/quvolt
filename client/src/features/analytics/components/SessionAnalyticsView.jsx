import React from 'react';
import useAnalyticsStore from '../../../stores/useAnalyticsStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { ExternalLink, Lock } from 'lucide-react';

import AnalyticsTierGuard from './AnalyticsTierGuard';
import BasicSessionAnalytics from './BasicSessionAnalytics';
import QuestionInsights from './QuestionInsights';
import AudienceInsights from './AudienceInsights';
import AnalyticsSkeleton from './AnalyticsSkeleton';
import EmptyAnalyticsState, { AnalyticsErrorState } from './EmptyAnalyticsState';

const SectionBadge = ({ label, colorClass }) => (
    <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${colorClass}`}>
        {label}
    </span>
);

const SessionAnalyticsView = () => {
    const user = useAuthStore((state) => state.user);
    const userTier = (user?.subscription?.plan || user?.plan || 'FREE').toUpperCase();

    const {
        activeSessionId,
        recentSessions,
        analyticsLoading,
        analyticsError,
        sessionAnalytics,
        questionInsights,
        audienceInsights,
        activePlan,
        liveParticipantCount,
        fetchFullAnalytics,
    } = useAnalyticsStore();

    if (!activeSessionId) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center pt-20">
                <EmptyAnalyticsState 
                    title="Select a session" 
                    message="Choose a session from the sidebar to view detailed real-time analytics."
                    showCTA={false}
                />
            </div>
        );
    }

    if (analyticsLoading) {
        return (
            <div className="flex-1">
                <AnalyticsSkeleton />
            </div>
        );
    }

    if (analyticsError) {
        // Handle 403 explicitly
        const isUnauthorized = analyticsError.toLowerCase().includes('unauthorized');
        
        return (
            <div className="flex-1 flex flex-col pt-10">
                <AnalyticsErrorState
                    title={isUnauthorized ? "Access Denied" : "Failed to load analytics"}
                    message={isUnauthorized 
                        ? "You don't have access to this session. It might belong to another host." 
                        : analyticsError}
                    icon={isUnauthorized ? Lock : undefined}
                    onRetry={isUnauthorized ? undefined : () => fetchFullAnalytics(activeSessionId)}
                />
            </div>
        );
    }

    const activeMeta = recentSessions.find(s => s.sessionId === activeSessionId) || {};

    return (
        <div className="flex-1 space-y-16 pb-20 max-w-5xl">
            {/* Header / Toolbar */}
            <div className="flex items-center justify-between pb-6 border-b theme-border">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl font-black theme-text-primary">
                            {activeMeta.title || 'Untitled Session'}
                        </h2>
                        {liveParticipantCount > 0 && (
                            <span className="px-3 py-1 bg-emerald-500/15 text-emerald-500 text-xs font-bold uppercase rounded-full tracking-wider animate-pulse">
                                🔴 {liveParticipantCount} live
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-sm theme-text-muted font-medium">
                        <span>Code: <strong className="theme-text-primary">{activeMeta.sessionCode}</strong></span>
                        <span>·</span>
                        <span>
                            {activeMeta.startedAt 
                                ? new Date(activeMeta.startedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                                : 'Unknown Date'}
                        </span>
                    </div>
                </div>

                <button 
                    onClick={() => window.open(`/host/results/${activeMeta.sessionCode}`, '_blank')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-sm font-bold theme-text-secondary transition-colors"
                >
                    <ExternalLink size={16} />
                    Open Results
                </button>
            </div>

            {/* SECTION 1 — Session Summary (all tiers) */}
            <section className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <h2 className="text-lg font-bold theme-text-primary tracking-tight">Session Summary</h2>
                    <SectionBadge label="Live Visibility" colorClass="bg-emerald-500/10 text-emerald-500" />
                </div>
                <BasicSessionAnalytics
                    summary={sessionAnalytics || {}}
                    leaderboard={sessionAnalytics?.topLeaderboard || []}
                />
            </section>

            {/* SECTION 2 — Audience Insights (Creator+) */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold theme-text-primary tracking-tight">Audience & Engagement</h2>
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
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold theme-text-primary tracking-tight">Question Intelligence</h2>
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
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold theme-text-primary tracking-tight">Organization Dashboard</h2>
                    <SectionBadge label="Enterprise Intelligence" colorClass="bg-purple-500/10 text-purple-500" />
                </div>
                <AnalyticsTierGuard userTier={userTier} requiredTier="TEAMS" featureName="Multi-Host Reporting">
                    <div className="theme-surface border border-dashed theme-border p-20 rounded-4xl flex flex-col items-center text-center">
                        <p className="text-sm font-medium theme-text-muted">
                            Organization-level aggregation across all hosts — coming to the Teams plan.
                        </p>
                    </div>
                </AnalyticsTierGuard>
            </section>

        </div>
    );
};

export default SessionAnalyticsView;
