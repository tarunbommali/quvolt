import { Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { buttonStyles } from '../../styles/buttonStyles';
import { components } from '../../styles/components';
import { cx } from '../../styles/theme';

const SlideList = ({
    mobile = false,
    questions,
    activeQuestionIndex,
    onSelect,
    onAddSlide,
    onReorder,
    onRequestEdit,
}) => {
    const [draggingIndex, setDraggingIndex] = useState(null);
    const [dropTargetIndex, setDropTargetIndex] = useState(null);
    const asideRef = useRef(null);
    const listRef = useRef(null);
    const itemRefs = useRef([]);

    useEffect(() => {
        const listEl = listRef.current;
        const itemEl = itemRefs.current[activeQuestionIndex];
        if (!listEl || !itemEl || mobile) return;

        const isFirst = activeQuestionIndex === 0;
        const isLast = activeQuestionIndex === questions.length - 1;

        if (isFirst) {
            listEl.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (isLast) {
            listEl.scrollTo({ top: listEl.scrollHeight, behavior: 'smooth' });
            return;
        }

        itemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [activeQuestionIndex, mobile, questions.length]);

    const handleSidebarKeyDown = (event) => {
        if (!questions.length) return;

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            event.stopPropagation();
            onSelect(Math.max(activeQuestionIndex - 1, 0));
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            event.stopPropagation();
            onSelect(Math.min(activeQuestionIndex + 1, questions.length - 1));
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            onRequestEdit?.();
        }
    };

    const handleDrop = (targetIndex) => {
        if (draggingIndex === null || targetIndex === null || draggingIndex === targetIndex) {
            setDraggingIndex(null);
            setDropTargetIndex(null);
            return;
        }

        onReorder?.(draggingIndex, targetIndex);
        setDraggingIndex(null);
        setDropTargetIndex(null);
    };

    return (
        <aside
            ref={asideRef}
            className={mobile ? 'space-y-3 rounded-2xl border theme-border theme-surface p-3 shadow-sm' : components.organizer.slideAside}
            tabIndex={mobile ? -1 : 0}
            onKeyDown={mobile ? undefined : handleSidebarKeyDown}
            aria-label="Slide list"
        >
            <div className={mobile ? 'flex items-center justify-between gap-3' : components.organizer.slideTopPad}>
                <button
                    type="button"
                    onClick={onAddSlide}
                    className={cx(buttonStyles.secondary, mobile ? 'inline-flex flex-1 justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold' : components.organizer.slideAddBtn)}
                >
                    <Plus size={16} /> Add Slide
                </button>
            </div>
            <div ref={listRef} className={mobile ? 'space-y-3' : components.organizer.slideListWrap}>
                {questions.map((question, index) => (
                    <div
                        ref={(node) => {
                            itemRefs.current[index] = node;
                        }}
                        key={question._id || question.clientId || index}
                        className={cx(
                            components.organizer.slideItemShell,
                            activeQuestionIndex === index ? components.organizer.slideItemShellActive : '',
                            draggingIndex === index ? components.organizer.slideDragGhost : '',
                            dropTargetIndex === index && draggingIndex !== index ? components.organizer.slideDropTarget : '',
                        )}
                        draggable={!mobile}
                        onDragStart={() => setDraggingIndex(index)}
                        onDragOver={(event) => {
                            event.preventDefault();
                            if (dropTargetIndex !== index) setDropTargetIndex(index);
                        }}
                        onDrop={(event) => {
                            event.preventDefault();
                            handleDrop(index);
                        }}
                        onDragEnd={() => {
                            setDraggingIndex(null);
                            setDropTargetIndex(null);
                        }}
                    >
                        <div className={components.organizer.slideItemRow}>
                            <button
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                    onSelect(index);
                                    asideRef.current?.focus();
                                }}
                                className={components.organizer.slideSelectBtn}
                            >
                                <span className={components.organizer.slideIndex}>{String(index + 1).padStart(2, '0')}</span>
                                <div
                                    className={cx(
                                        components.organizer.slideThumb,
                                        activeQuestionIndex === index ? components.organizer.slideThumbActive : components.organizer.slideThumbIdle,
                                    )}
                                >
                                    <div className={components.organizer.slideThumbAccent} />
                                    <div className={components.organizer.slideThumbPreview}>
                                        <div className={components.organizer.slideBarStrong} />
                                        <div className={components.organizer.slideBarSoft} />
                                    </div>
                                    <div className={components.organizer.slideMiniGrid}>
                                        <div className={components.organizer.slideMiniCell} />
                                        <div className={components.organizer.slideMiniCell} />
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                ))}

                {!questions.length ? (
                    <div className={components.organizer.slideEmptyState}>
                        No slides yet. Press Ctrl+Enter to add your first slide.
                    </div>
                ) : null}
            </div>
        </aside>
    );
};

export default SlideList;
