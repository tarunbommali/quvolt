import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import Toast from '../../../components/common/Toast';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog';
import TemplateList from '../components/TemplateList';
import CreateTemplatePanel from '../components/CreateTemplatePanel';
import StudioDashboardToolbar from '../components/StudioDashboardToolbar';
import LoadingScreen from '../../../components/common/LoadingScreen';

import { useAuthStore } from '../../../stores/useAuthStore';
import UpgradeBanner from '../../../components/common/ui/UpgradeBanner';
import useStudioDashboardController from '../hooks/useStudioDashboardController';
import { Layout, Plus, Layers } from 'lucide-react';
import { components, layout, typography, buttonStyles, cards, cx } from '../../../styles/index';

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

    if (isLoading) return <LoadingScreen />;

    return (
        <div className="app-page animate-in fade-in duration-300">
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

            <div className={layout.page}>

                {/* ── Page Header ─────────────────────────────────────────── */}
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[var(--qb-primary)]/10 text-[var(--qb-primary)] flex items-center justify-center">
                                <Layout size={15} />
                            </div>
                            <p className={typography.eyebrow}>Creator Studio</p>
                        </div>
                        <h1 className={typography.h1}>Template Library</h1>
                        <p className={typography.body}>
                            Build, manage, and launch interactive quiz templates.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        {/* Template count badge */}
                        <div className={cx(cards.subtle, 'flex items-center gap-2 px-3 py-2')}>
                            <Layers size={14} className="theme-text-muted" />
                            <span className={typography.smallMd}>
                                {visibleQuizzes.length} template{visibleQuizzes.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {/* Primary CTA */}
                        <Motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleToggleCreate}
                            className={cx(buttonStyles.base, buttonStyles.primary, buttonStyles.sizeMd)}
                        >
                            <Plus size={16} />
                            New Template
                        </Motion.button>
                    </div>
                </header>

                {/* ── Upgrade Banner ───────────────────────────────────────── */}
                {user?.subscription?.plan === 'FREE' && (
                    <UpgradeBanner />
                )}

                {/* ── Control / Toolbar Bar ────────────────────────────────── */}
                <section className={components.studio.controlBar}>
                    <div className={components.studio.controlInner}>
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
                    </div>
                </section>

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
                            onCreate={createQuiz}
                            isPaid={isPaid}
                            onPaidToggle={handlePaidToggle}
                            quizPrice={quizPrice}
                            onPriceChange={setQuizPrice}
                            subscriptionEntitlements={subscriptionEntitlements}
                            quizTemplateCount={quizTemplateCount}
                        />
                    )}
                </AnimatePresence>

                {/* ── Template Grid ─────────────────────────────────────────── */}
                <section className={layout.section}>
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
                        onViewHistory={(quiz) => navigate(`/quiz/templates/${quiz._id}/sessions`)}
                        viewMode={effectiveViewMode}
                    />
                </section>

            </div>
        </div>
    );
};

export default Studio;
