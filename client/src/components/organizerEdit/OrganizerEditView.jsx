/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import EditorLayout from './EditorLayout';
import SlidePanel from './SlidePanel';
import CanvasView from './CanvasView';
import ConfigSidebar from './ConfigSidebar';
import OrganizerEditHeader from './OrganizerEditHeader';
import OrganizerEditOverlays from './OrganizerEditOverlays';

/**
 * Full organizer editor view that composes the editor chrome and modal states.
 * @param {{ editor: object }} props
 */
const OrganizerEditView = ({ editor }) => {
    const {
        activeQuiz,
        config,
        isSaving,
        persistFullState,
        orderedSlides,
        activeQuestionIndex,
        activeQuestion,
        handleDeleteQuestion,
        handleQuestionTextChange,
        handleOptionChange,
        handleTimeLimitChange,
        handleQuestionTypeChange,
        handleCorrectOptionChange,
        handleToggleShuffleOptions,
        handleToggleShuffleQuestions,
        handleMoveQuestionUp,
        handleMoveQuestionDown,
        handleApplyToAllSlides,
        handleImportSlides,
        handleAIGenerate,
        handleAISave,
        setImportDialogOpen,
        handleOpenAIDialog,
        setActiveSlideByIndex,
        addSlide,
        navigate,
    } = editor;

    return (
        <>
            <OrganizerEditOverlays editor={editor} />

            <EditorLayout
                header={(
                    <OrganizerEditHeader
                        title={activeQuiz.title}
                        isSaving={isSaving}
                        onBack={() => navigate('/studio')}
                        onOpenImport={() => setImportDialogOpen(true)}
                        onOpenAI={handleOpenAIDialog}
                        onOpenResults={() => navigate(`/results/${activeQuiz._id}`, { state: { quiz: activeQuiz } })}
                        onSave={() => persistFullState()}
                        onLaunch={() => navigate(`/launch/${activeQuiz._id}`, { state: { quiz: activeQuiz } })}
                    />
                )}
                slidePanel={(
                    <SlidePanel
                        questions={orderedSlides}
                        activeQuestionIndex={activeQuestionIndex}
                        onSelect={setActiveSlideByIndex}
                        onAddSlide={addSlide}
                        onDeleteSlide={handleDeleteQuestion}
                        onMoveUp={handleMoveQuestionUp}
                        onMoveDown={handleMoveQuestionDown}
                    />
                )}
                canvasView={(
                    <CanvasView
                        activeQuestion={activeQuestion}
                        activeQuestionIndex={activeQuestionIndex}
                        totalQuestions={orderedSlides.length}
                        onQuestionTextChange={handleQuestionTextChange}
                        onOptionChange={handleOptionChange}
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
                        onDeleteCurrentSlide={() => handleDeleteQuestion(activeQuestion?.clientId)}
                    />
                )}
            />
        </>
    );
};

export default OrganizerEditView;
