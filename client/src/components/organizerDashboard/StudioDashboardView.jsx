import { AnimatePresence } from 'framer-motion';
import Toast from '../common/Toast';
import ConfirmationDialog from '../common/ConfirmationDialog';
import ProjectGrid from './ProjectGrid';
import CreateTemplatePanel from './CreateTemplatePanel';
import StudioDashboardToolbar from './StudioDashboardToolbar';
import LoadingScreen from '../common/LoadingScreen';
import { components } from '../../styles/components';
import { layoutStyles } from '../../styles/layoutStyles';
import { cx } from '../../styles/theme';

/**
 * Dashboard composition for studio templates and folders.
 * @param {{ dashboard: object }} props
 */
const StudioDashboardView = ({ dashboard }) => {
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

                <ProjectGrid
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

export default StudioDashboardView;
