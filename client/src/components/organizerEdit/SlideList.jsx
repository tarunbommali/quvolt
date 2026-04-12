import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { buttonStyles } from '../../styles/buttonStyles';
import { components } from '../../styles/components';
import { cx } from '../../styles/theme';

const SlideList = ({
    questions,
    activeQuestionIndex,
    onSelect,
    onAddSlide,
    onDeleteSlide,
    onMoveUp,
    onMoveDown,
}) => {
    const handleSidebarKeyDown = (event) => {
        if (!questions.length) return;

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            onSelect(Math.max(activeQuestionIndex - 1, 0));
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            onSelect(Math.min(activeQuestionIndex + 1, questions.length - 1));
        }
    };

    return (
    <aside
        className={components.organizer.slideAside}
        tabIndex={0}
        onKeyDown={handleSidebarKeyDown}
        aria-label="Slide list"
    >
        <div className={components.organizer.slideTopPad}>
            <button
                onClick={onAddSlide}
                className={cx(buttonStyles.secondary, components.organizer.slideAddBtn)}
            >
                <Plus size={16} /> NEW SLIDE
            </button>
        </div>
        <div className={components.organizer.slideListWrap}>
            {questions.map((question, index) => (
                <button
                    type="button"
                    key={question._id || index}
                    onClick={() => onSelect(index)}
                    className={components.organizer.slideItem}
                >
                    <div className={components.organizer.slideItemRow}>
                        <span className={components.organizer.slideIndex}>{index + 1}</span>
                        <div
                            className={cx(
                                components.organizer.slideThumb,
                                activeQuestionIndex === index ? components.organizer.slideThumbActive : components.organizer.slideThumbIdle,
                            )}
                        >
                            <div className={components.organizer.slideBarStrong}></div>
                            <div className={components.organizer.slideBarSoft}></div>
                            <div className={components.organizer.slideMiniGrid}>
                                <div className={components.organizer.slideMiniCell}></div>
                                <div className={components.organizer.slideMiniCell}></div>
                            </div>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onMoveUp(index);
                            }}
                            disabled={index === 0}
                            className={cx(components.organizer.slideActionBase, components.organizer.slideActionTop)}
                        >
                            <ArrowUp size={14} />
                        </button>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSlide(question._id);
                            }}
                            className={cx(components.organizer.slideActionBase, components.organizer.slideActionMid)}
                        >
                            <Trash2 size={14} />
                        </button>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onMoveDown(index);
                            }}
                            disabled={index === questions.length - 1}
                            className={cx(components.organizer.slideActionBase, components.organizer.slideActionBottom)}
                        >
                            <ArrowDown size={14} />
                        </button>
                    </div>
                </button>
            ))}
        </div>
    </aside>
    );
};

export default SlideList;
