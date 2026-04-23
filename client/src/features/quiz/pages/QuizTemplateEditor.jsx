import { useCallback, useEffect, useRef, useState } from 'react';
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

const HISTORY_LIMIT = 80;

const cloneSnapshot = (snapshot) => JSON.parse(JSON.stringify(snapshot));

const snapshotKey = (snapshot) => JSON.stringify({
    slides: snapshot.slides,
    order: snapshot.order,
    activeSlideId: snapshot.activeSlideId,
    config: snapshot.config,
});

/**
 * Full host editor view that composes the editor chrome and modal states.
 */
const QuizTemplateEditor = () => {
    const editor = useHostEditController();
    const [mobileTab, setMobileTab] = useState('slides');
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    const [isCanvasEditing, setIsCanvasEditing] = useState(false);

    const undoStackRef = useRef([]);
    const redoStackRef = useRef([]);
    const lastSnapshotKeyRef = useRef('');
    const restoringRef = useRef(false);

    const {
        activeQuiz,
        config,
        isSaving,
        persistFullState,
        orderedSlides,
        activeQuestionIndex,
        activeQuestion,
        activeSlideId,
        getSnapshot,
        restoreSnapshot,
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
    } = editor;

    useEffect(() => {
        const currentSnapshot = getSnapshot();
        const key = snapshotKey(currentSnapshot);

        if (!lastSnapshotKeyRef.current) {
            lastSnapshotKeyRef.current = key;
            return;
        }

        if (restoringRef.current || lastSnapshotKeyRef.current === key) {
            lastSnapshotKeyRef.current = key;
            return;
        }

        undoStackRef.current.push(cloneSnapshot({ ...currentSnapshot, __from: 'state' }));
        if (undoStackRef.current.length > HISTORY_LIMIT) undoStackRef.current.shift();
        redoStackRef.current = [];
        lastSnapshotKeyRef.current = key;
    }, [orderedSlides, config, activeSlideId, getSnapshot]);

    const runUndo = useCallback(() => {
        const stack = undoStackRef.current;
        if (!stack.length) return;
        const previous = stack.pop();
        const current = cloneSnapshot(getSnapshot());
        redoStackRef.current.push(current);
        restoringRef.current = true;
        restoreSnapshot(previous);
        window.setTimeout(() => {
            restoringRef.current = false;
            lastSnapshotKeyRef.current = snapshotKey(getSnapshot());
        }, 0);
    }, [getSnapshot, restoreSnapshot]);

    const runRedo = useCallback(() => {
        const stack = redoStackRef.current;
        if (!stack.length) return;
        const next = stack.pop();
        const current = cloneSnapshot(getSnapshot());
        undoStackRef.current.push(current);
        restoringRef.current = true;
        restoreSnapshot(next);
        window.setTimeout(() => {
            restoringRef.current = false;
            lastSnapshotKeyRef.current = snapshotKey(getSnapshot());
        }, 0);
    }, [getSnapshot, restoreSnapshot]);

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
                if (event.shiftKey) runRedo();
                else runUndo();
                return;
            }

            if (!withCtrl && event.shiftKey && event.key.toLowerCase() === 'z' && !isInput) {
                event.preventDefault();
                runRedo();
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
        runRedo,
        runUndo,
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
            {/* Simple Header */}
            <div className={components.host.mobileHeader}>
                <h2 className={components.host.mobileHeaderTitle}>{activeQuiz.title}</h2>
                <span className={components.host.mobileHeaderMeta}>Q{activeQuestionIndex + 1} / {orderedSlides.length}</span>
            </div>

            {/* Canvas Full Focus */}
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

            {/* Fixed Bottom Navigation */}
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

            {/* Bottom Drawer */}
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
        <>
            <OrganizerEditOverlays editor={editor} />

            <EditorLayout
                mobileShell={mobileShell}
                header={(
                    <OrganizerEditHeader
                        title={activeQuiz.title}
                        isSaving={isSaving}
                        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                        onBack={() => navigate('/studio')}
                        onOpenImport={() => setImportDialogOpen(true)}
                        onOpenAI={handleOpenAIDialog}
                        onOpenResults={() => navigate(`/quiz/templates/${activeQuiz._id}/sessions`, { state: { quiz: activeQuiz } })}
                        onSave={() => persistFullState()}
                        onLaunch={openSessionRoom}
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
        </>
    );
};

export default QuizTemplateEditor;

