import React from 'react';
import { motion as Motion } from 'framer-motion';
import useAnalyticsStore from '../../../stores/useAnalyticsStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { ExternalLink, Lock } from 'lucide-react';

import AnalyticsSectionWrapper from './AnalyticsSectionWrapper';
import BasicSessionAnalytics from './BasicSessionAnalytics';
import QuestionInsights from './QuestionInsights';
import AudienceInsights from './AudienceInsights';
import AnalyticsSkeleton from './AnalyticsSkeleton';
import EmptyAnalyticsState, { AnalyticsErrorState } from './EmptyAnalyticsState';
import { typography, buttonStyles, layout, cx } from '../../../styles/index'

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

        fetchFullAnalytics,
    } = useAnalyticsStore();

    // ── Gating Logic ─────────────────────────────────────────────────────────

    const getAccessState = (feature) => {
        if (userTier === 'TEAMS') return "SUBSCRIBED";
        if (userTier === 'CREATOR' && feature !== 'ORG') return "SUBSCRIBED";

        return "FREE_LOCKED";
    };

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
        <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cx('flex-1 space-y-10 pb-16 max-w-5xl')}
        >
            {/* Header / Toolbar */}
            <div className={cx(layout.rowBetween, 'pb-6 border-b theme-border flex-wrap gap-4')}>
                <div>
                    <div className={cx(layout.rowStart, 'mb-1')}>
                        <h2 className={typography.pageTitle}>
                            {activeMeta.title || 'Untitled Session'}
                        </h2>
                        {activeMeta.liveCount > 0 && (
                            <span className="px-2.5 py-0.5 bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 text-xs font-medium rounded-full animate-pulse ml-2">
                                🔴 {activeMeta.liveCount} live
                            </span>
                        )}
                    </div>
                    <div className={cx(typography.small, 'flex items-center gap-2')}>
                        <span>Code: <strong className="theme-text-primary">{activeMeta.sessionCode}</strong></span>
                        <span className="opacity-40">•</span>
                        <span>
                            {activeMeta.startedAt
                                ? new Date(activeMeta.startedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                                : 'Unknown Date'}
                        </span>
                    </div>
                </div>

                <button
                    onClick={() => window.open(`/host/results/${activeMeta.sessionCode}`, '_blank')}
                    className={cx(buttonStyles.base, buttonStyles.secondary, buttonStyles.sizeMd, 'gap-1.5')}
                >
                    <ExternalLink size={14} />
                    Results
                </button>
            </div>

            {/* SECTION 1 — Session Summary */}
            <section className="space-y-4">
                <div className="px-1 space-y-0.5">
                    <h2 className={typography.h2}>Overview</h2>
                    <p className={typography.body}>Core Performance Metrics</p>
                </div>
                <BasicSessionAnalytics
                    summary={sessionAnalytics || {}}
                    leaderboard={sessionAnalytics?.topLeaderboard || []}
                />
            </section>

            {/* SECTION 2 — Audience Insights */}
            <AnalyticsSectionWrapper
                title="Audience & Engagement"
                description="Participant Demographics & Behavior"
                accessState={getAccessState("AUDIENCE")}
                upgradePlan="CREATOR"
                currentPlan={userTier}
            >
                <AudienceInsights data={audienceInsights || {}} />
            </AnalyticsSectionWrapper>

            {/* SECTION 3 — Question Intelligence */}
            <AnalyticsSectionWrapper
                title="Question Intelligence"
                description="Individual Question Deep-Dive"
                accessState={getAccessState("QUESTIONS")}
                upgradePlan="CREATOR"
                currentPlan={userTier}
            >
                <QuestionInsights
                    stats={questionInsights?.questions || []}
                    summary={questionInsights?.summary || {}}
                />
            </AnalyticsSectionWrapper>

            {/* SECTION 4 — Organization Export */}
            <AnalyticsSectionWrapper
                title="Organization Export"
                description="Enterprise Reporting & Compliance"
                accessState={getAccessState("ORG")}
                upgradePlan="TEAMS"
                currentPlan={userTier}
            >
                <div className="border border-dashed theme-border p-12 rounded-2xl flex flex-col items-center text-center theme-surface-soft">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 rounded-xl flex items-center justify-center mb-4">
                        <ExternalLink size={24} />
                    </div>
                    <h4 className={typography.h3}>Advanced Data Exports</h4>
                    <p className={cx(typography.small, 'max-w-xs mt-1')}>
                        CSV, PDF, and automated email reporting for your entire organization. Coming soon to the Teams plan.
                    </p>
                </div>
            </AnalyticsSectionWrapper>
        </Motion.div>
    );
};

export default SessionAnalyticsView;
