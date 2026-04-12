import QuestionCanvas from './QuestionCanvas';

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