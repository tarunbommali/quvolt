import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gethostAnalyticsSummary, getUserAnalytics } from '../../../host/services/host.service';
import { useAuthStore } from '../../../stores/useAuthStore';
import MetricsCards from '../../../host/components/MetricsCards';
import ChartsSection from '../../../host/components/ChartsSection';
import MetricsSection from '../../../host/components/MetricsSection';
import TableSection from '../../../host/components/TableSection';
import PageHeader from '../../../components/layout/PageHeader';
import ErrorState from '../../../components/common/ErrorState';
import { components, layout, cx } from '../../../styles/index';

const AnalyticsDashboardPage = () => {
    const user = useAuthStore((state) => state.user);
    const ishost = user?.role === 'host' || user?.role === 'admin';

    const userAnalyticsQuery = useQuery({
        queryKey: ['analytics-user', user?._id || 'anon'],
        queryFn: () => getUserAnalytics(),
        staleTime: 60_000,
    });

    const hostSummaryQuery = useQuery({
        queryKey: ['analytics-summary', user?._id || 'anon'],
        queryFn: () => gethostAnalyticsSummary(),
        enabled: ishost,
        staleTime: 60_000,
    });

    const userData = userAnalyticsQuery.data;
    const summary = hostSummaryQuery.data;

    const summaryMetrics = useMemo(() => {
        if (!userData?.summary) return [];

        return [
            { label: 'Accuracy', value: userData.summary.accuracyPercent || 0, suffix: '%', caption: 'Correct answers ratio' },
            { label: 'Total Answers', value: userData.summary.totalAnswers || 0, caption: 'All submitted attempts' },
            { label: 'Avg Time (s)', value: userData.summary.avgTime || 0, caption: 'Average time per question' },
            { label: 'Avg Score', value: userData.summary.avgScore || 0, caption: 'Average score per submission' },
            { label: 'Quizzes Played', value: userData.summary.quizzesPlayed || 0, caption: 'Unique quizzes attempted' },
        ];
    }, [userData]);

    const primaryMetrics = useMemo(() => ([
        { label: 'Total Quizzes', value: Number(summary?.totals?.totalQuizzesCreated || 0).toLocaleString() },
        { label: 'Active Quizzes', value: Number(summary?.totals?.activeQuizzes || 0).toLocaleString() },
        { label: 'Completion Rate', value: `${Number(summary?.participants?.completionRate || 0).toFixed(1)}%` },
        { label: 'Total Participants', value: Number(summary?.totals?.totalParticipantsInvited || 0).toLocaleString() },
    ]), [summary]);

    const isLoading = userAnalyticsQuery.isLoading || (ishost && hostSummaryQuery.isLoading);
    const hasError = userAnalyticsQuery.error || hostSummaryQuery.error;
    const dashboardHref = ishost ? '/workspace' : '/join';
    const participantRows = useMemo(() => (
        (userData?.quizBreakdown || []).map((row) => ({
            quizId: row.quizId,
            title: row.title,
            accuracyPercent: row.accuracy,
            participantCount: row.total,
            averageScore: row.avgScore,
        }))
    ), [userData]);

    return (
        <div className={cx(layout.page, "space-y-6")}>
            <PageHeader
                breadcrumbs={[{ label: ishost ? 'Workspace' : 'Join', href: dashboardHref }, { label: 'Analytics' }]}
            />

            {hasError ? (
                <ErrorState
                    title="Failed to load analytics"
                    message={hasError?.response?.data?.message || hasError?.message || 'Something went wrong while loading analytics.'}
                    onAction={() => {
                        userAnalyticsQuery.refetch();
                        hostSummaryQuery.refetch();
                    }}
                />
            ) : null}

            {isLoading ? (
                <div className={components.analytics.loadingCard}>
                    Loading analytics...
                </div>
            ) : null}

            {!isLoading && userData ? (
                <>
                    {ishost && summary ? (
                        <MetricsSection
                            primaryMetrics={primaryMetrics}
                            performance={summary.performance || {}}
                            participants={summary.participants || {}}
                        />
                    ) : <MetricsCards metrics={summaryMetrics} />}

                    <ChartsSection
                        performanceOverTime={userData.performanceOverTime || []}
                        questionStats={userData.questionStats || []}
                    />

                    {ishost && summary ? (
                        <TableSection rows={summary.topQuizzes || []} />
                    ) : (
                        <TableSection rows={participantRows} />
                    )}
                </>
            ) : null}
        </div>
    );
};

export default AnalyticsDashboardPage;

