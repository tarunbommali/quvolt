import SlideList from './SlideList';

/**
 * Slide panel wrapper for the host editor.
 * @param {{ questions: Array, activeQuestionIndex: number, onSelect: Function, onAddSlide: Function, onReorder?: Function, onRequestEdit?: Function }} props
 */
const SlidePanel = ({
    mobile = false,
    questions,
    activeQuestionIndex,
    onSelect,
    onAddSlide,
    onReorder,
    onRequestEdit,
}) => (
    <SlideList
        mobile={mobile}
        questions={questions}
        activeQuestionIndex={activeQuestionIndex}
        onSelect={onSelect}
        onAddSlide={onAddSlide}
        onReorder={onReorder}
        onRequestEdit={onRequestEdit}
    />
);

export default SlidePanel;

