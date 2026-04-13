import QuestionCanvas from './QuestionCanvas';

/**
 * Canvas wrapper that renders the active question editor.
 * @param {{ activeQuestion: object | null, activeQuestionIndex: number, totalQuestions: number, onQuestionTextChange: Function, onOptionChange: Function }} props
 */
const CanvasView = ({
    activeQuestion,
    activeQuestionIndex,
    totalQuestions,
    onQuestionTextChange,
    onOptionChange,
}) => (
    <QuestionCanvas
        activeQuestion={activeQuestion}
        activeQuestionIndex={activeQuestionIndex}
        totalQuestions={totalQuestions}
        onQuestionTextChange={onQuestionTextChange}
        onOptionChange={onOptionChange}
    />
);

export default CanvasView;