import { useCallback, useEffect, useState } from 'react';
import { List, SlidersHorizontal } from 'lucide-react';
import EditorLayout from '../components/EditorLayout';
import SlidePanel from '../components/SlidePanel';
import CanvasView from '../components/CanvasView';
import ConfigSidebar from '../components/ConfigSidebar';
import OrganizerEditHeader from '../components/OrganizerEditHeader';
import OrganizerEditOverlays from '../components/OrganizerEditOverlays';
import EditorCommandPalette from '../components/EditorCommandPalette';

import { resolveSessionRoute } from '../../../utils/sessionRouteResolver';
import useHostEditController from '../../host/hooks/useHostEditController';
import { components, cx } from '../../../styles/index';
import { EditorProvider } from '../../host/context/EditorContext.jsx';

/**
 * Full host editor view that composes the editor chrome and modal states.
 * Upgraded to use the elite modular system with history and command layer.
 */
const QuizTemplateEditor = () => {
    const editor = useHostEditController();
    const [mobileTab, setMobileTab] = useState('slides');
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    const [isCanvasEditing, setIsCanvasEditing] = useState(false);

    const {
        activeQuiz,
        config,
        isSaving,
        saveStatus,
        persistFullState,
        orderedSlides,
        activeQuestionIndex,
        activeQuestion,
        activeSlideId,
        handleDeleteQuestion,
        handleQuestionTextChange,
        handleOptionChange,
        handleTimeLimitChange,
        handleQuestionTypeChange,
        handleCorrectOptionChange,
        handleToggleShuffleOptions,
        handleToggleShuffleQuestions,
        handleMoveSlide,
        handleDuplicateSlide,
        handleApplyToAllSlides,
        setImportDialogOpen,
        handleOpenAIDialog,
        setActiveSlideByIndex,
        addSlide,
        navigate,
        undo,
        redo,
        canUndo,
        canRedo
    } = editor;

    // Global Keyboard Shortcuts
    useEffect(() => {
        const handleGlobalShortcuts = (event) => {
            if (event.defaultPrevented) return;

            const target = event.target;
            const isInput = target instanceof HTMLInputElement
                || target instanceof HTMLTextAreaElement
                || target?.isContentEditable;
            const withCtrl = event.ctrlKey || event.metaKey;

            if (event.key === 'Escape') {
                if (commandPaletteOpen) setCommandPaletteOpen(false);
                setIsCanvasEditing(false);
                return;
            }

            if (withCtrl && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setCommandPaletteOpen(true);
                return;
            }

            if (withCtrl && event.key.toLowerCase() === 's') {
                event.preventDefault();
                persistFullState();
                return;
            }

            if (withCtrl && event.key.toLowerCase() === 'd') {
                event.preventDefault();
                handleDuplicateSlide(activeQuestionIndex);
                return;
            }

            if (withCtrl && event.key === 'Delete') {
                event.preventDefault();
                if (activeQuestion?.clientId) handleDeleteQuestion(activeQuestion.clientId);
                return;
            }

            if (withCtrl && event.key === 'Enter') {
                event.preventDefault();
                addSlide();
                setIsCanvasEditing(true);
                return;
            }

            if (withCtrl && event.key.toLowerCase() === 'z') {
                event.preventDefault();
                if (event.shiftKey) redo();
                else undo();
                return;
            }

            if (isInput) return;

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveSlideByIndex(Math.max(activeQuestionIndex - 1, 0));
                return;
            }

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveSlideByIndex(Math.min(activeQuestionIndex + 1, Math.max(orderedSlides.length - 1, 0)));
                return;
            }

            if (event.key === 'Enter') {
                event.preventDefault();
                setIsCanvasEditing(true);
            }
        };

        window.addEventListener('keydown', handleGlobalShortcuts);
        return () => window.removeEventListener('keydown', handleGlobalShortcuts);
    }, [
        activeQuestion,
        activeQuestionIndex,
        addSlide,
        commandPaletteOpen,
        handleDeleteQuestion,
        handleDuplicateSlide,
        orderedSlides.length,
        persistFullState,
        undo,
        redo,
        setActiveSlideByIndex,
    ]);

    const openSessionRoom = () => {
        const nextQuiz = {
            ...activeQuiz,
            sessionCode: activeQuiz.sessionCode || activeQuiz.activeSessionCode || activeQuiz.roomCode,
        };

        navigate(resolveSessionRoute(nextQuiz), { state: { quiz: nextQuiz } });
    };

    if (!activeQuiz) {
        return (
            <div className="flex h-screen items-center justify-center theme-surface">
                <div className="rounded-2xl border theme-border bg-white p-8 text-center text-sm font-semibold theme-text-muted">
                    Loading template data...
                </div>
            </div>
        );
    }

    const mobileShell = (
        <section className={components.host.mobileShellContainer}>
            <div className={components.host.mobileHeader}>
                <h2 className={components.host.mobileHeaderTitle}>{activeQuiz.title}</h2>
                <span className={components.host.mobileHeaderMeta}>Q{activeQuestionIndex + 1} / {orderedSlides.length}</span>
            </div>

            <div className={components.host.mobileCanvasWrapper}>
                <CanvasView
                    activeQuestion={activeQuestion}
                    activeQuestionIndex={activeQuestionIndex}
                    totalQuestions={orderedSlides.length}
                    onQuestionTextChange={handleQuestionTextChange}
                    onOptionChange={handleOptionChange}
                    isEditing={isCanvasEditing}
                    onEnterEdit={() => setIsCanvasEditing(true)}
                    onExitEdit={() => setIsCanvasEditing(false)}
                />
            </div>

            <div className={components.host.mobileBottomNav} role="tablist" aria-label="Editor sections">
                <button
                    type="button"
                    role="tab"
                    aria-selected={mobileTab === 'slides'}
                    onClick={() => setMobileTab(prev => prev === 'slides' ? null : 'slides')}
                    className={cx(
                        components.host.mobileNavBtn,
                        mobileTab === 'slides' ? components.host.mobileNavBtnActive : '',
                    )}
                >
                    <List size={16} />
                    <span>Slides</span>
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={mobileTab === 'settings'}
                    onClick={() => setMobileTab(prev => prev === 'settings' ? null : 'settings')}
                    className={cx(
                        components.host.mobileNavBtn,
                        mobileTab === 'settings' ? components.host.mobileNavBtnActive : '',
                    )}
                >
                    <SlidersHorizontal size={16} />
                    <span>Settings</span>
                </button>
            </div>

            {mobileTab && (
                <div className={components.host.mobileDrawer}>
                    {mobileTab === 'slides' ? (
                        <SlidePanel
                            mobile
                            questions={orderedSlides}
                            activeQuestionIndex={activeQuestionIndex}
                            onSelect={setActiveSlideByIndex}
                            onAddSlide={addSlide}
                            onReorder={handleMoveSlide}
                            onRequestEdit={() => setIsCanvasEditing(true)}
                        />
                    ) : (
                        <ConfigSidebar
                            mobile
                            activeQuiz={{ ...activeQuiz, shuffleQuestions: config.shuffleQuestions }}
                            activeQuestion={activeQuestion}
                            questions={orderedSlides}
                            onToggleShuffleOptions={handleToggleShuffleOptions}
                            onToggleShuffleQuestions={handleToggleShuffleQuestions}
                            onApplyToAllSlides={handleApplyToAllSlides}
                            onQuestionTypeChange={handleQuestionTypeChange}
                            onCorrectOptionChange={handleCorrectOptionChange}
                            onDeleteCurrentSlide={() => handleDeleteQuestion(activeQuestion?.clientId)}
                        />
                    )}
                </div>
            )}
        </section>
    );

    return (
        <EditorProvider value={editor}>
            <OrganizerEditOverlays editor={editor} />

            <EditorLayout
                mobileShell={mobileShell}
                header={(
                    <OrganizerEditHeader
                        title={activeQuiz.title}
                        isSaving={isSaving}
                        saveStatus={saveStatus}
                        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                        onBack={() => navigate('/studio')}
                        onOpenImport={() => setImportDialogOpen(true)}
                        onOpenAI={handleOpenAIDialog}
                        onOpenResults={() => navigate(`/quiz/templates/${activeQuiz._id}/sessions`, { state: { quiz: activeQuiz } })}
                        onSave={() => persistFullState()}
                        onLaunch={openSessionRoom}
                        onUndo={undo}
                        onRedo={redo}
                        canUndo={canUndo}
                        canRedo={canRedo}
                    />
                )}
                slidePanel={(
                    <SlidePanel
                        questions={orderedSlides}
                        activeQuestionIndex={activeQuestionIndex}
                        onSelect={setActiveSlideByIndex}
                        onAddSlide={addSlide}
                        onReorder={handleMoveSlide}
                        onRequestEdit={() => setIsCanvasEditing(true)}
                    />
                )}
                canvasView={(
                    <CanvasView
                        activeQuestion={activeQuestion}
                        activeQuestionIndex={activeQuestionIndex}
                        totalQuestions={orderedSlides.length}
                        onQuestionTextChange={handleQuestionTextChange}
                        onOptionChange={handleOptionChange}
                        isEditing={isCanvasEditing}
                        onEnterEdit={() => setIsCanvasEditing(true)}
                        onExitEdit={() => setIsCanvasEditing(false)}
                    />
                )}
                configSidebar={(
                    <ConfigSidebar
                        activeQuiz={{ ...activeQuiz, shuffleQuestions: config.shuffleQuestions }}
                        activeQuestion={activeQuestion}
                        questions={orderedSlides}
                        onToggleShuffleOptions={handleToggleShuffleOptions}
                        onToggleShuffleQuestions={handleToggleShuffleQuestions}
                        onApplyToAllSlides={handleApplyToAllSlides}
                        onTimeLimitChange={handleTimeLimitChange}
                        onQuestionTypeChange={handleQuestionTypeChange}
                        onCorrectOptionChange={handleCorrectOptionChange}
                        onDeleteCurrentSlide={() => {
                            if (activeQuestion?.clientId) handleDeleteQuestion(activeQuestion.clientId);
                        }}
                    />
                )}
            />

            <EditorCommandPalette
                open={commandPaletteOpen}
                slides={orderedSlides}
                activeIndex={activeQuestionIndex}
                onSelect={(index) => {
                    setActiveSlideByIndex(index);
                    setIsCanvasEditing(false);
                }}
                onClose={() => setCommandPaletteOpen(false)}
            />
        </EditorProvider>
    );
};

export default QuizTemplateEditor;
