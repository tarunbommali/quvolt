import QuestionCanvas from './QuestionCanvas';

/**
 * Canvas wrapper that renders the active question editor.
 * @param {{ activeQuestion: object | null, activeQuestionIndex: number, totalQuestions: number, onQuestionTextChange: Function, onOptionChange: Function, isEditing?: boolean, onEnterEdit?: Function, onExitEdit?: Function }} props
 */
const CanvasView = ({
    activeQuestion,
    activeQuestionIndex,
    totalQuestions,
    onQuestionTextChange,
    onOptionChange,
    isEditing,
    onEnterEdit,
    onExitEdit,
}) => (
    <QuestionCanvas
        activeQuestion={activeQuestion}
        activeQuestionIndex={activeQuestionIndex}
        totalQuestions={totalQuestions}
        onQuestionTextChange={onQuestionTextChange}
        onOptionChange={onOptionChange}
        isEditing={isEditing}
        onEnterEdit={onEnterEdit}
        onExitEdit={onExitEdit}
    />
);

export default CanvasView;