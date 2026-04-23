import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAnalyticsStore from '../../../stores/useAnalyticsStore';
import SubHeader from '../../../components/layout/SubHeader';
import AnalyticsSkeleton from '../../analytics/components/AnalyticsSkeleton';
import EmptyAnalyticsState, { AnalyticsErrorState } from '../../analytics/components/EmptyAnalyticsState';
import { Users, Clock } from 'lucide-react';

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
                <AnalyticsSkeleton />
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

            <div className="max-w-7xl w-full mx-auto pt-6 pb-24 px-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {recentSessions.map(session => (
                    <div
                        key={session.sessionId}
                        onClick={() => navigate(`/analytics/${session.sessionId}`)}
                        className="group cursor-pointer theme-surface border theme-border p-6 rounded-3xl hover:border-[var(--qb-primary)]/50 hover:shadow-xl hover:shadow-[var(--qb-primary)]/5 transition-all duration-300 flex flex-col h-full relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[var(--qb-primary)]/10 to-transparent rounded-bl-[100px] pointer-events-none" />
                        
                        <div className="flex items-center gap-3 mb-4">
                            <StatusDot status={session.status} />
                            <span className="text-xs font-bold uppercase tracking-wider theme-text-muted">
                                {session.status === 'live' ? 'LIVE NOW' : session.status}
                            </span>
                        </div>

                        <h2 className="font-bold text-lg theme-text-primary mb-1 line-clamp-2">
                            {session.title || 'Untitled Quiz'}
                        </h2>
                        <p className="text-sm font-medium theme-text-muted mb-6">
                            Code: <span className="theme-text-primary">{session.sessionCode}</span>
                        </p>

                        <div className="mt-auto pt-4 border-t theme-border flex items-center justify-between text-sm font-medium theme-text-secondary">
                            <div className="flex items-center gap-1.5">
                                <Users size={16} className="opacity-70" />
                                <span>{session.participantCount}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock size={16} className="opacity-70" />
                                <span>
                                    {session.startedAt 
                                        ? new Date(session.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
                                        : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsListPage;
