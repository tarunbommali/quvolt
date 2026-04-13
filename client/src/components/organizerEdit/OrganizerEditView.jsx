import { useCallback, useEffect, useRef, useState } from 'react';
import { List, SlidersHorizontal } from 'lucide-react';
import EditorLayout from './EditorLayout';
import SlidePanel from './SlidePanel';
import CanvasView from './CanvasView';
import ConfigSidebar from './ConfigSidebar';
import OrganizerEditHeader from './OrganizerEditHeader';
import OrganizerEditOverlays from './OrganizerEditOverlays';
import EditorCommandPalette from './EditorCommandPalette';
import { components } from '../../styles/components';
import { cx } from '../../styles/theme';
import { resolveSessionRoute } from '../../utils/sessionRouteResolver';

const HISTORY_LIMIT = 80;

const cloneSnapshot = (snapshot) => JSON.parse(JSON.stringify(snapshot));

const snapshotKey = (snapshot) => JSON.stringify({
    slides: snapshot.slides,
    order: snapshot.order,
    activeSlideId: snapshot.activeSlideId,
    config: snapshot.config,
});

const THEME_PRESETS = {
    light: {
        className: 'bg-[linear-gradient(180deg,#eff3ff_0%,#f8fafc_100%)]',
        style: {
            '--qb-primary': '#4f46e5',
            '--qb-primary-strong': '#4338ca',
            '--qb-surface-1': '#f8fafc',
            '--qb-surface-2': '#e9eefc',
            '--qb-text-1': '#0f172a',
            '--qb-text-2': '#334155',
            '--qb-border': '#cbd5e1',
        },
    },
    dark: {
        className: 'bg-[radial-gradient(circle_at_top,#1d2a4d_0%,#0b1024_62%)]',
        style: {
            '--qb-primary': '#6366f1',
            '--qb-primary-strong': '#4f46e5',
        },
    },
    presentation: {
        className: 'bg-[radial-gradient(circle_at_top,#2a2533_0%,#0a0a0a_65%)]',
        style: {
            '--qb-primary': '#f59e0b',
            '--qb-primary-strong': '#d97706',
            '--qb-text-1': '#ffffff',
            '--qb-text-2': '#f8fafc',
            '--qb-border': '#f59e0b',
            '--qb-surface-1': '#0b0b0d',
            '--qb-surface-2': '#1a1a22',
        },
    },
};

/**
 * Full organizer editor view that composes the editor chrome and modal states.
 * @param {{ editor: object }} props
 */
const OrganizerEditView = ({ editor }) => {
    const [mobileTab, setMobileTab] = useState('slides');
    const [themeMode, setThemeMode] = useState('dark');
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

    const themePreset = THEME_PRESETS[themeMode] || THEME_PRESETS.dark;
    const openSessionRoom = () => {
        const nextQuiz = {
            ...activeQuiz,
            sessionCode: activeQuiz.sessionCode || activeQuiz.activeSessionCode || activeQuiz.roomCode,
        };

        navigate(resolveSessionRoute(nextQuiz), { state: { quiz: nextQuiz } });
    };

    const mobileShell = (
        <section className={components.organizer.mobileShellContainer}>
            {/* Simple Header */}
            <div className={components.organizer.mobileHeader}>
                <h2 className={components.organizer.mobileHeaderTitle}>{activeQuiz.title}</h2>
                <span className={components.organizer.mobileHeaderMeta}>Q{activeQuestionIndex + 1} / {orderedSlides.length}</span>
            </div>

            {/* Canvas Full Focus */}
            <div className={components.organizer.mobileCanvasWrapper}>
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
            <div className={components.organizer.mobileBottomNav} role="tablist" aria-label="Editor sections">
                <button
                    type="button"
                    role="tab"
                    aria-selected={mobileTab === 'slides'}
                    onClick={() => setMobileTab(prev => prev === 'slides' ? null : 'slides')}
                    className={cx(
                        components.organizer.mobileNavBtn,
                        mobileTab === 'slides' ? components.organizer.mobileNavBtnActive : '',
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
                        components.organizer.mobileNavBtn,
                        mobileTab === 'settings' ? components.organizer.mobileNavBtnActive : '',
                    )}
                >
                    <SlidersHorizontal size={16} />
                    <span>Settings</span>
                </button>
            </div>

            {/* Bottom Drawer */}
            {mobileTab && (
                <div className={components.organizer.mobileDrawer}>
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
                        themeMode={themeMode}
                        onThemeModeChange={setThemeMode}
                        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                        onBack={() => navigate('/studio')}
                        onOpenImport={() => setImportDialogOpen(true)}
                        onOpenAI={handleOpenAIDialog}
                        onOpenResults={() => navigate(`/results/${activeQuiz._id}`, { state: { quiz: activeQuiz } })}
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
                rootClassName={themePreset.className}
                rootStyle={themePreset.style}
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

export default OrganizerEditView;
