import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Toast from '../../../components/common/Toast';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog';
import TemplateList from '../components/TemplateList';
import CreateTemplatePanel from '../components/CreateTemplatePanel';
import StudioDashboardToolbar from '../components/StudioDashboardToolbar';
import LoadingScreen from '../../../components/common/LoadingScreen';
import { components } from '../../../styles/components';
import { layoutStyles } from '../../../styles/layoutStyles';
import { cx } from '../../../styles/theme';
import { useAuthStore } from '../../../stores/useAuthStore';
import UpgradeBanner from '../../../components/common/ui/UpgradeBanner';
import useStudioDashboardController from '../hooks/useStudioDashboardController';

/**
 * Dashboard composition for studio templates and folders.
 */
const Studio = () => {
    const user = useAuthStore((s) => s.user);
    const dashboard = useStudioDashboardController();
    const navigate = useNavigate();
    const {
        isLoading,
        toast,
        clearToast,
        confirmDialog,
        setConfirmDialog,
        visibleQuizzes,
        showCreate,
        currentSubject,
        cloning,
        editingQuizId,
        editingTitle,
        setEditingQuizId,
        setEditingTitle,
        handleRenameQuiz,
        createQuiz,
        cloneTemplate,
        handleDeleteQuiz,
        prefetchQuizNavigation,
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
        quizTemplateCount,
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
        onOpenSubject,
        onEditQuiz,
        onGoLive,
    } = dashboard;

    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <>
            <AnimatePresence>
                {toast ? <Toast message={toast.message} type={toast.type} onClose={clearToast} /> : null}
                {confirmDialog ? (
                    <ConfirmationDialog
                        open={!!confirmDialog}
                        message={confirmDialog.message}
                        confirmLabel="Delete"
                        onConfirm={confirmDialog.onConfirm}
                        onCancel={() => setConfirmDialog(null)}
                    />
                ) : null}
            </AnimatePresence>

            <div className={cx(components.studio.pageShell, layoutStyles.pageStack)}>
                <StudioDashboardToolbar
                    showCreate={showCreate}
                    onToggleCreate={handleToggleCreate}
                    onGlobalDefaults={() => navigate('/studio/settings')}
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

                {user?.subscription?.plan === 'FREE' && (
                    <div className="px-1 pt-2">
                        <UpgradeBanner />
                    </div>
                )}

                <TemplateList
                    quizzes={visibleQuizzes}
                    cloning={cloning}
                    editingQuizId={editingQuizId}
                    editingTitle={editingTitle}
                    onStartEdit={(quiz) => {
                        setEditingQuizId(quiz._id);
                        setEditingTitle(quiz.title);
                    }}
                    onEditingTitleChange={setEditingTitle}
                    onRename={handleRenameQuiz}
                    onCancelEdit={() => setEditingQuizId(null)}
                    onDelete={handleDeleteQuiz}
                    onClone={cloneTemplate}
                    onOpenSubject={onOpenSubject}
                    onEditQuiz={onEditQuiz}
                    onGoLive={onGoLive}
                    onPrefetch={prefetchQuizNavigation}
                    onSessionSettings={(quiz) => navigate(`/quiz/templates/${quiz._id}/settings`)}
                    viewMode={effectiveViewMode}
                />

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
                    onCreate={createQuiz}
                    isPaid={isPaid}
                    onPaidToggle={handlePaidToggle}
                    quizPrice={quizPrice}
                    onPriceChange={setQuizPrice}
                    subscriptionEntitlements={subscriptionEntitlements}
                    quizTemplateCount={quizTemplateCount}
                />
            </div>
        </>
    );
};

export default Studio;

