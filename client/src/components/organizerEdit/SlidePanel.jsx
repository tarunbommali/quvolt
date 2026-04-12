import SlideList from './SlideList';

const SlidePanel = ({
    questions,
    activeQuestionIndex,
    onSelect,
    onAddSlide,
    onDeleteSlide,
    onMoveUp,
    onMoveDown,
}) => (
    <SlideList
        questions={questions}
        activeQuestionIndex={activeQuestionIndex}
        onSelect={onSelect}
        onAddSlide={onAddSlide}
        onDeleteSlide={onDeleteSlide}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
    />
);

export default SlidePanel;