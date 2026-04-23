import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import useAnalyticsStore from '../../../stores/useAnalyticsStore';
import SubHeader from '../../../components/layout/SubHeader';
import AnalyticsSkeleton from '../../analytics/components/AnalyticsSkeleton';
import EmptyAnalyticsState, { AnalyticsErrorState } from '../../analytics/components/EmptyAnalyticsState';
import { Users, Clock } from 'lucide-react';
import { textStyles, components, layout, cx } from '../../../styles/index';

const StatusDot = ({ status }) => {
    const color =
        status === 'live'      ? 'bg-emerald-500 animate-pulse' :
        status === 'completed' ? 'bg-gray-400' :
        status === 'waiting'   ? 'bg-amber-400' : 'bg-gray-300';
    return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color} shadow-sm`} />;
};

const AnalyticsListPage = () => {
    const navigate = useNavigate();
    const { recentSessions, fetchRecentSessions, sessionsLoading, sessionsError } = useAnalyticsStore();

    useEffect(() => {
        fetchRecentSessions(20);
    }, [fetchRecentSessions]);

    if (sessionsLoading) {
        return (
            <div className="app-page">
                <SubHeader
                    title="Performance Analytics"
                    subtitle="Select a session to view real-time insights, question intelligence, and audience engagement."
                    breadcrumbs={[{ label: 'Studio', href: '/studio' }, { label: 'Analytics' }]}
                />
                <div className={layout.page}>
                    <AnalyticsSkeleton />
                </div>
            </div>
        );
    }

    if (sessionsError) {
        return (
            <div className="app-page">
                <SubHeader 
                    title="Performance Analytics" 
                    breadcrumbs={[{ label: 'Studio', href: '/studio' }, { label: 'Analytics' }]} 
                />
                <AnalyticsErrorState
                    message={sessionsError}
                    onRetry={() => fetchRecentSessions(20)}
                />
            </div>
        );
    }

    if (!sessionsLoading && recentSessions.length === 0) {
        return (
            <div className="app-page">
                <SubHeader 
                    title="Performance Analytics" 
                    breadcrumbs={[{ label: 'Studio', href: '/studio' }, { label: 'Analytics' }]} 
                />
                <EmptyAnalyticsState />
            </div>
        );
    }

    return (
        <div className="app-page flex flex-col h-screen overflow-y-auto custom-scrollbar">
            <SubHeader
                title="Performance Analytics"
                subtitle="Select a session to view real-time insights, question intelligence, and audience engagement."
                breadcrumbs={[{ label: 'Studio', href: '/studio' }, { label: 'Analytics' }]}
            />

            <div className={cx(layout.page, "pt-6 pb-24")}>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {recentSessions.map((session, idx) => (
                    <Motion.div
                        key={session.sessionId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ y: -8, scale: 1.02 }}
                        onClick={() => navigate(`/analytics/${session.sessionId}`)}
                        className={components.analytics.card + " !p-6 !rounded-[2.5rem] group cursor-pointer hover:border-[var(--qb-primary)]/50 hover:shadow-2xl hover:shadow-[var(--qb-primary)]/10 transition-all duration-500 flex flex-col h-full relative overflow-hidden"}
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[var(--qb-primary)]/10 to-transparent rounded-bl-[100px] pointer-events-none group-hover:scale-110 transition-transform duration-700" />
                        
                        <div className="flex items-center gap-3 mb-4">
                            <StatusDot status={session.status} />
                            <span className={textStyles.metaLabel + " font-bold uppercase tracking-wider"}>
                                {session.status === 'live' ? 'LIVE NOW' : session.status}
                            </span>
                        </div>

                        <h2 className={textStyles.title + " !text-lg mb-1 line-clamp-2"}>
                            {session.title || 'Untitled Quiz'}
                        </h2>
                        <p className={textStyles.metaLabel + " font-medium mb-6"}>
                            Code: <span className="theme-text-primary font-bold">{session.sessionCode}</span>
                        </p>

                        <div className="mt-auto pt-4 border-t theme-border flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Users size={16} className="theme-text-muted opacity-70" />
                                <span className={textStyles.metaLabel + " font-bold"}>{session.participantCount}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock size={16} className="theme-text-muted opacity-70" />
                                <span className={textStyles.metaLabel + " font-bold"}>
                                    {session.startedAt 
                                        ? new Date(session.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
                                        : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </Motion.div>
                ))}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsListPage;

