import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../stores/useAuthStore';
import LoadingScreen from '../../../components/common/LoadingScreen';
import BreadCrumbs from '../../../components/layout/BreadCrumbs';
import HistoryGrid from '../components/HistoryGrid';
import HistoryEmptyState from '../components/HistoryEmptyState';
import { panelStyles, typography, layout, buttonStyles, cards, cx } from '../../../styles/index';
import usePaginatedFetch from '../../../hooks/usePaginatedFetch';
import Pagination from '../../../components/common/ui/Pagination';

const DetailedQuizAnalytics = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);

    const {
        data: sessions,
        loading,
        error,
        pagination,
        page,
        setPage,
        limit,
        setLimit,
        refetch
    } = usePaginatedFetch(`/quiz/templates/${id}/sessions`, {
        page: 1,
        limit: 5,
        sortBy: 'startedAt',
        order: 'desc'
    });

    const [templateTitle, setTemplateTitle] = useState(location.state?.quiz?.title || 'Quiz');

    React.useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [page]);

    if (loading && sessions.length === 0) return <LoadingScreen />;

    if (error) {
        return (
            <div className={cx(layout.page, "space-y-8")}>
                <BreadCrumbs
                    breadcrumbs={[
                        { label: 'Editor', href: `/quiz/templates/${id}` },
                        { label: 'History' }
                    ]}
                />
                <div className={cx(cards.base, "text-center py-12")}>
                    <p className={cx(typography.bodyStrong, 'text-red-500')}>{error}</p>
                    <button
                        onClick={refetch}
                        className={cx(buttonStyles.base, buttonStyles.ghost, 'mt-3 text-red-600 dark:text-red-400')}
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={cx(layout.page, "space-y-8 animate-in fade-in duration-500")}>
            <BreadCrumbs
                breadcrumbs={[
                    { label: 'Workspace', href: '/workspace' },
                    { label: 'Editor', href: `/quiz/templates/${id}` },
                    { label: 'History' }
                ]}
            />

            {sessions.length === 0 ? (
                <HistoryEmptyState
                    title="No Sessions Conducted"
                    message="You haven't conducted any sessions with this template yet. Once you host a session, it will appear here."
                />
            ) : (
                <div className={layout.section}>
                    <div className="relative">
                        {loading && sessions.length > 0 && (
                            <div className="absolute inset-0 z-10 bg-white/20 backdrop-blur-[1px] dark:bg-black/20" />
                        )}
                        <HistoryGrid
                            records={sessions.map(s => ({
                                ...s,
                                title: templateTitle,
                                quizTitle: templateTitle,
                                date: s.startedAt || s.createdAt,
                            }))}
                            userRole={user?.role || 'host'}
                            onNavigate={(record) => navigate(`/history/${record._id}`)}
                            onOpenLeaderboard={(e) => e.stopPropagation()}
                            onPrefetch={() => { }}
                        />
                    </div>
                    
                    {pagination && pagination.total > 10 && (
                        <Pagination 
                            pagination={pagination}
                            onPageChange={setPage}
                            onLimitChange={setLimit}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default DetailedQuizAnalytics;
