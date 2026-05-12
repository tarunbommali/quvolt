import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import Toast from '../../../components/common/Toast';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog';
import TemplateList from '../components/TemplateList';
import CreateQuizModal from '../components/CreateQuizModal';
import WorkspaceDashboardToolbar from '../components/WorkspaceDashboardToolbar';
import LoadingScreen from '../../../components/common/LoadingScreen';
import Pagination from '../../../components/common/ui/Pagination';
import WorkspaceFilterModal from '../components/WorkspaceFilterModal';

import { useAuthStore } from '../../../stores/useAuthStore';
import UpgradeBanner from '../../../components/common/ui/UpgradeBanner';
import useWorkspaceDashboardController from '../hooks/useWorkspaceDashboardController';
import { Plus } from 'lucide-react';
import { layout, buttonStyles, cx } from '../../../styles/index';
import { Filter } from 'lucide-react';
import { textStyles } from '../../../styles';
import PageHeader from '../../../components/layout/PageHeader';
import { LayersPlus } from 'lucide-react';

const Workspace = () => {
    const user = useAuthStore((s) => s.user);
    const dashboard = useWorkspaceDashboardController();
    const navigate = useNavigate();
    const {
        templates,
        isLoading,
        pagination,
        page,
        setPage,
        limit,
        setLimit,
        toast,
        clearToast,
        confirmDialog,
        setConfirmDialog,
        showCreate,
        currentSubject,
        cloning,
        editingQuizId,
        editingTitle,
        setEditingQuizId,
        setEditingTitle,
        handleRenameTemplate,
        createTemplate,
        cloneTemplate,
        handleDeleteTemplate,
        prefetchTemplateNavigation,
        onOpenSubject,
        onGoLive,
        onEditTemplate,
        handleToggleCreate,
        handleToggleMasteryMode,
        effectiveViewMode,
        handleViewModeChange,
        sortMode,
        setSortMode,
        filterMode,
        setFilterMode,
        searchQuery,
        setSearchQuery,
        subscriptionEntitlements,
        itemCount,
        templateCount,
        quizType,
        setQuizType,
        accessType,
        setAccessType,
        allowedEmailsText,
        setAllowedEmailsText,
        quizMode,
        setQuizMode,
        newQuizTitle,
        setNewQuizTitle,
        breadcrumbs,
        isFilterModalOpen,
        setIsFilterModalOpen,
        activeFilterCount,
        dateRange,
        setDateRange,
    } = dashboard;

    const handleFilterClick = () => setIsFilterModalOpen(true);

    React.useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [page]);

    if (dashboard.isLoading && !templates.length) return <LoadingScreen />;

    return (


        <div
            className={cx(layout.page, 'min-h-screen')}            >
            <AnimatePresence>
                {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
                {confirmDialog && (
                    <ConfirmationDialog
                        open={!!confirmDialog}
                        message={confirmDialog.message}
                        confirmLabel="Delete Permanently"
                        onConfirm={confirmDialog.onConfirm}
                        onCancel={() => setConfirmDialog(null)}
                    />
                )}
            </AnimatePresence>

            {/* ── Page Header ─────────────────────────────────────────── */}
            <PageHeader
                breadcrumbs={breadcrumbs.length > 0 ? [
                    { label: 'Workspace', href: '/workspace' },
                    ...breadcrumbs.slice(0, -1).map((crumb, idx) => ({
                        label: crumb.label,
                        href: `/workspace/collection/${crumb.id}`,
                        state: {
                            subject: { _id: crumb.id, title: crumb.label },
                            breadcrumbs: breadcrumbs.slice(0, idx + 1)
                        }
                    })),
                    { label: breadcrumbs[breadcrumbs.length - 1].label }
                ] : [{ label: 'Workspace' }]}
                actions={(
                    <div className="flex items-center ">
                        <button
                            onClick={handleFilterClick}
                            className={cx(buttonStyles.base, "ml-8 hover:transition-all hover:scale-110 ")}
                        >
                            <Filter
                                size={16}
                                className={cx(
                                    activeFilterCount > 0
                                        ? "text-[var(--qb-primary)] opacity-100"
                                        : "opacity-60"
                                )}
                            />
                        </button>

                    </div>
                )}
            />


            {/* ── Upgrade Banner ───────────────────────────────────────── */}
            {user?.subscription?.plan === 'FREE' && (
                <UpgradeBanner />
            )}

            {/* ── Control / Toolbar Bar ────────────────────────────────── */}
            <WorkspaceDashboardToolbar
                showCreate={showCreate}
                onToggleCreate={handleToggleCreate}
                viewMode={effectiveViewMode}
                onViewModeChange={handleViewModeChange}
                isMobileView={dashboard.isMobileView}
                sortMode={sortMode}
                onSortModeChange={setSortMode}
                filterMode={filterMode}
                onFilterModeChange={setFilterMode}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                folderId={dashboard.folderId}
                onOpenAnalytics={() => navigate(`/workspace/collection/${dashboard.folderId}/analytics`, { state: { folderTitle: currentSubject?.title } })}
                isMasteryMode={currentSubject?.leaderboard?.groupBy === 'unit'}
                onToggleMastery={handleToggleMasteryMode}
            />

            <WorkspaceFilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                viewMode={effectiveViewMode}
                onViewModeChange={handleViewModeChange}
                sortMode={sortMode}
                onSortModeChange={setSortMode}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                activeFilterCount={activeFilterCount}
            />

            {/* ── Create Quiz Modal ────────────────────────────────────── */}
            <CreateQuizModal
                open={showCreate}
                onClose={handleToggleCreate}
                quizType={quizType}
                onQuizTypeChange={setQuizType}
                accessType={accessType}
                onAccessTypeChange={setAccessType}
                quizMode={quizMode}
                onQuizModeChange={setQuizMode}
                newQuizTitle={newQuizTitle}
                onTitleChange={setNewQuizTitle}
                onCreate={createTemplate}
                subscriptionEntitlements={subscriptionEntitlements}
            />

            {/* ── Template Grid ─────────────────────────────────────────── */}
            <section className={cx(layout.section, 'flex-grow flex flex-col')}>
                <TemplateList
                    templates={templates}
                    isLoading={isLoading}
                    cloning={cloning}
                    editingQuizId={editingQuizId}
                    editingTitle={editingTitle}
                    onStartEdit={(t) => {
                        setEditingQuizId(t._id);
                        setEditingTitle(t.title);
                    }}
                    onEditingTitleChange={setEditingTitle}
                    onRename={handleRenameTemplate}
                    onCancelEdit={() => setEditingQuizId(null)}
                    onDelete={handleDeleteTemplate}
                    onClone={cloneTemplate}
                    onOpenSubject={onOpenSubject}
                    onEditQuiz={onEditTemplate}
                    onGoLive={onGoLive}
                    onPrefetch={prefetchTemplateNavigation}
                    onSessionSettings={(t) => navigate(`/quiz/templates/${t._id}/settings`)}
                    onViewHistory={(t) => navigate(`/quiz/templates/${t._id}/sessions`)}
                    onViewAnalytics={(t) => navigate(`/workspace/collection/${t._id}/analytics`, { state: { folderTitle: t.title } })}
                    viewMode={effectiveViewMode}
                    parentGroupBy={currentSubject?.leaderboard?.groupBy || 'default'}
                />

                {pagination && pagination.total > (limit || 10) && (
                    <div className="mt-auto pt-8">
                        <Pagination
                            pagination={pagination}
                            onPageChange={setPage}
                            onLimitChange={setLimit}
                        />
                    </div>
                )}
            </section>
        </div>

    );
};

export default Workspace;
