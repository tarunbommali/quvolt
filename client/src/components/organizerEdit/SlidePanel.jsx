import SlideList from './SlideList';

/**
 * Slide panel wrapper for the organizer editor.
 * @param {{ questions: Array, activeQuestionIndex: number, onSelect: Function, onAddSlide: Function, onDeleteSlide: Function, onMoveUp: Function, onMoveDown: Function }} props
 */
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