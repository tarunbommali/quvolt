import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import Toast from '../../../components/common/Toast';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog';
import TemplateList from '../components/TemplateList';
import CreateTemplatePanel from '../components/CreateTemplatePanel';
import StudioDashboardToolbar from '../components/StudioDashboardToolbar';
import LoadingScreen from '../../../components/common/LoadingScreen';
import SubHeader from '../../../components/layout/SubHeader';
import Pagination from '../../../components/common/ui/Pagination';

import { useAuthStore } from '../../../stores/useAuthStore';
import UpgradeBanner from '../../../components/common/ui/UpgradeBanner';
import useStudioDashboardController from '../hooks/useStudioDashboardController';
import { Plus } from 'lucide-react';
import { layout, buttonStyles, cx } from '../../../styles/index';

const Studio = () => {
    const user = useAuthStore((s) => s.user);
    const dashboard = useStudioDashboardController();
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
        effectiveViewMode,
        handleViewModeChange,
        sortMode,
        setSortMode,
        filterMode,
        setFilterMode,
        searchQuery,
        setSearchQuery,
        subscriptionEntitlements,
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
                <SubHeader
                    title={currentSubject ? currentSubject.title : 'Template Library'}
                    subtitle={currentSubject
                        ? `Managing ${templates.length} items in this folder.`
                        : 'Build, manage, and launch interactive quiz templates.'}
                    breadcrumbs={breadcrumbs.length > 0 ? [
                        { label: 'Studio', href: '/studio' },
                        ...breadcrumbs.slice(0, -1).map(c => ({
                            label: c.label,
                            href: `/studio/folder/${c.id}`,
                            state: {
                                subject: { _id: c.id, title: c.label },
                                breadcrumbs: breadcrumbs.slice(0, breadcrumbs.findIndex(x => x.id === c.id) + 1)
                            }
                        })),
                        { label: breadcrumbs[breadcrumbs.length - 1].label }
                    ] : [{ label: 'Studio' }]}
                    actions={(
                        <Motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleToggleCreate}
                            className={cx(buttonStyles.base, buttonStyles.primary, buttonStyles.sizeMd)}
                        >
                            <Plus size={16} />
                            New {currentSubject ? 'Item' : 'Template'}
                        </Motion.button>
                    )}
                />

                {/* ── Upgrade Banner ───────────────────────────────────────── */}
                {user?.subscription?.plan === 'FREE' && (
                    <UpgradeBanner />
                )}

                {/* ── Control / Toolbar Bar ────────────────────────────────── */}
                <StudioDashboardToolbar
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
                />

                {/* ── Create Panel ─────────────────────────────────────────── */}
                <AnimatePresence mode="wait">
                    {showCreate && (
                        <CreateTemplatePanel
                            showCreate={showCreate}
                            currentSubject={currentSubject}
                            quizType={quizType}
                            onQuizTypeChange={setQuizType}
                            accessType={accessType}
                            onAccessTypeChange={setAccessType}
                            allowedEmailsText={allowedEmailsText}
                            onAllowedEmailsTextChange={setAllowedEmailsText}
                            quizMode={quizMode}
                            onQuizModeChange={setQuizMode}
                            newQuizTitle={newQuizTitle}
                            onTitleChange={setNewQuizTitle}
                            onCreate={createTemplate}
                            isPaid={isPaid}
                            onPaidToggle={handlePaidToggle}
                            quizPrice={quizPrice}
                            onPriceChange={setQuizPrice}
                            subscriptionEntitlements={subscriptionEntitlements}
                            templateCount={templateCount}
                        />
                    )}
                </AnimatePresence>

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
                        viewMode={effectiveViewMode}
                    />

                    {pagination && (
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

export default Studio;
