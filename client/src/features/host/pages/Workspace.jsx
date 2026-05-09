import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import Toast from '../../../components/common/Toast';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog';
import TemplateList from '../components/TemplateList';
import CreateQuizModal from '../components/CreateQuizModal';
import WorkspaceDashboardToolbar from '../components/WorkspaceDashboardToolbar';
import LoadingScreen from '../../../components/common/LoadingScreen';
import BreadCrumbs from '../../../components/layout/BreadCrumbs';
import Pagination from '../../../components/common/ui/Pagination';

import { useAuthStore } from '../../../stores/useAuthStore';
import UpgradeBanner from '../../../components/common/ui/UpgradeBanner';
import useWorkspaceDashboardController from '../hooks/useWorkspaceDashboardController';
import { Plus } from 'lucide-react';
import { layout, buttonStyles, cx } from '../../../styles/index';

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
        isPaid,
        quizPrice,
        setQuizPrice,
        handlePaidToggle,
        breadcrumbs,
    } = dashboard;

    React.useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [page]);

    if (dashboard.isLoading && !templates.length) return <LoadingScreen />;

    return (
        <div className="animate-in fade-in duration-300">
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

            <div className={cx(layout.page, 'min-h-[100vh] flex flex-col')}>

                {/* ── Page Header ─────────────────────────────────────────── */}
                <BreadCrumbs
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
                        <Motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleToggleCreate}
                            className={cx(buttonStyles.base, buttonStyles.primary, buttonStyles.sizeMd)}
                        >
                            <Plus size={16} />
                            New {currentSubject ? 'Item' : 'Quiz'}
                        </Motion.button>
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
        </div>
    );
};

export default Workspace;
