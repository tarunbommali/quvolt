import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import useAnalyticsStore from '../../../stores/useAnalyticsStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { getSocket } from '../../../sockets/socketClient';

import SubHeader from '../../../components/layout/SubHeader';
import { ArrowLeft, ExternalLink, Lock, Activity, Users, Target, Clock, Zap } from 'lucide-react';

import AnalyticsSectionWrapper from '../../analytics/components/AnalyticsSectionWrapper';
import BasicSessionAnalytics from '../../analytics/components/BasicSessionAnalytics';
import QuestionInsights from '../../analytics/components/QuestionInsights';
import AudienceInsights from '../../analytics/components/AudienceInsights';
import AnalyticsSkeleton from '../../analytics/components/AnalyticsSkeleton';
import { AnalyticsErrorState } from '../../analytics/components/EmptyAnalyticsState';

import { layoutStyles } from '../../../styles/layoutStyles';
import { textStyles, components, layout, typography, cards, buttonStyles, cx } from '../../../styles/index';

const SessionAnalyticsPage = () => {
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
        isPaidSession,
        fetchFullAnalytics,
        subscribeToRealtimeUpdates,
        recentSessions,
        fetchRecentSessions,
    } = useAnalyticsStore();

    // ── Gating Logic ─────────────────────────────────────────────────────────

    const getAccessState = (feature) => {
        if (userTier === 'TEAMS') return "SUBSCRIBED";
        if (userTier === 'CREATOR' && feature !== 'ORG') return "SUBSCRIBED";
        if (isPaidSession && feature !== 'ORG') return "PAID_UNLOCKED";
        return "FREE_LOCKED";
    };

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

    const handleBack = () => navigate('/analytics');

    if (analyticsLoading) {
        return (
            <div className={layout.page}>
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
            ctaText = "Go back to Analytics";
            onCtaClick = handleBack;
        } else if (isNotFound) {
            title = "Session Not Found";
            message = "This session either doesn't exist or has been deleted.";
            ctaText = "Go back to Analytics";
            onCtaClick = handleBack;
        }

        return (
            <div className={cx(layout.page, "py-20")}>
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
    const activeMeta = currentIndex > -1 ? recentSessions[currentIndex] : {};

    return (
        <Motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen pb-24"
        >
            <div className={layout.page}>
                <SubHeader 
                    title="Session Analytics"
                    subtitle="Performance, engagement, and participant outcomes."
                    breadcrumbs={[
                        { label: 'Analytics', href: '/analytics' },
                        { label: activeMeta.sessionCode || 'Session' }
                    ]}
                    actions={
                        <div className={cx(cards.subtle, 'hidden md:flex items-center gap-2 px-3 py-2')}>
                            <Zap size={13} className="text-[var(--qb-primary)]" />
                            <span className={typography.smallMd}>{activeMeta.sessionCode || '—'}</span>
                            {activeMeta.startedAt && (
                                <>
                                    <span className="w-px h-3 bg-[var(--qb-border)]" />
                                    <span className={typography.metaLabel}>
                                        {new Date(activeMeta.startedAt).toLocaleDateString()}
                                    </span>
                                </>
                            )}
                        </div>
                    }
                />

                    {/* ── Quick Stat Cards ──────────────────────────────── */}
                    <div className={layout.metricGrid4}>
                        {[
                            { label: 'Avg Score',    val: sessionAnalytics?.summary?.avgScore || 0,              icon: Target,   color: 'indigo'  },
                            { label: 'Completion',   val: `${sessionAnalytics?.summary?.completionRate || 0}%`,  icon: Activity, color: 'emerald' },
                            { label: 'Participants', val: sessionAnalytics?.summary?.participantCount || 0,       icon: Users,    color: 'amber'   },
                            { label: 'Avg Accuracy', val: `${sessionAnalytics?.summary?.avgAccuracy || 0}%`,     icon: Zap,      color: 'purple'  },
                        ].map((stat, i) => (
                            <Motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 * i }}
                                className={cards.metric}
                            >
                                <div className={`w-7 h-7 rounded-lg bg-${stat.color}-500/10 text-${stat.color}-500 flex items-center justify-center`}>
                                    <stat.icon size={14} />
                                </div>
                                <p className={typography.metaLabel}>{stat.label}</p>
                                <p className={typography.metricMd}>{stat.val}</p>
                            </Motion.div>
                        ))}
                    </div>
                <div className={layout.sectionLg}>
                    {/* Section 1 — Overview */}
                    <section className={layout.section}>
                        <div className="space-y-1">
                            <h2 className={typography.h2}>Overview</h2>
                            <p className={typography.body}>Participant performance and comparative metrics.</p>
                        </div>
                        <BasicSessionAnalytics
                            summary={sessionAnalytics || {}}
                            leaderboard={sessionAnalytics?.topLeaderboard || []}
                        />
                    </section>

                    {/* Section 2 — Audience Insights */}
                    <AnalyticsSectionWrapper
                        title="Audience & Engagement"
                        description="Participant behavior and activity trends across the session."
                        accessState={getAccessState("AUDIENCE")}
                        upgradePlan="CREATOR"
                        currentPlan={userTier}
                    >
                        <AudienceInsights data={audienceInsights || {}} />
                    </AnalyticsSectionWrapper>

                    {/* Section 3 — Question Intelligence */}
                    <AnalyticsSectionWrapper
                        title="Question Intelligence"
                        description="Question-level insights and cognitive performance metrics."
                        accessState={getAccessState("QUESTIONS")}
                        upgradePlan="CREATOR"
                        currentPlan={userTier}
                    >
                        <QuestionInsights
                            stats={questionInsights?.questions || []}
                            summary={questionInsights?.summary || {}}
                        />
                    </AnalyticsSectionWrapper>

                    {/* Section 4 — Organization Export */}
                    <AnalyticsSectionWrapper
                        title="Organization Export"
                        description="Enterprise reporting and compliance logs."
                        accessState={getAccessState("ORG")}
                        upgradePlan="TEAMS"
                        currentPlan={userTier}
                    >
                        <div className={cx(cards.empty, 'flex flex-col items-center gap-4')}>
                            <div className="w-10 h-10 bg-[var(--qb-primary)]/10 rounded-xl flex items-center justify-center text-[var(--qb-primary)]">
                                <ExternalLink size={18} />
                            </div>
                            <div className="space-y-1 text-center">
                                <h4 className={typography.h4}>Enterprise Compliance Exports</h4>
                                <p className={cx(typography.small, 'max-w-xs mx-auto')}>
                                    CSV, PDF, and automated email reporting. Coming soon to Teams.
                                </p>
                            </div>
                            <span className="text-xs font-medium text-[var(--qb-primary)] bg-[var(--qb-primary)]/10 px-3 py-1 rounded-full">Coming Soon</span>
                        </div>
                    </AnalyticsSectionWrapper>
                </div>
            </div>
        </Motion.div>
    );
};

export default SessionAnalyticsPage;
