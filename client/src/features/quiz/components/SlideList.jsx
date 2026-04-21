import { Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { buttonStyles } from '../../../styles/buttonStyles';
import { components } from '../../../styles/components';
import { cx } from '../../../styles/theme';

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
            className={mobile ? 'space-y-3 rounded-2xl border theme-border theme-surface p-3 shadow-sm' : components.host.slideAside}
            tabIndex={mobile ? -1 : 0}
            onKeyDown={mobile ? undefined : handleSidebarKeyDown}
            aria-label="Slide list"
        >
            <div className={mobile ? 'flex items-center justify-between gap-3' : components.host.slideTopPad}>
                <button
                    type="button"
                    onClick={onAddSlide}
                    className={cx(buttonStyles.secondary, mobile ? 'inline-flex flex-1 justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold' : components.host.slideAddBtn)}
                >
                    <Plus size={16} /> Add Slide
                </button>
            </div>
            <div ref={listRef} className={mobile ? 'space-y-3' : components.host.slideListWrap}>
                {questions.map((question, index) => (
                    <div
                        ref={(node) => {
                            itemRefs.current[index] = node;
                        }}
                        key={question._id || question.clientId || index}
                        className={cx(
                            components.host.slideItemShell,
                            activeQuestionIndex === index ? components.host.slideItemShellActive : '',
                            draggingIndex === index ? components.host.slideDragGhost : '',
                            dropTargetIndex === index && draggingIndex !== index ? components.host.slideDropTarget : '',
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
                        <div className={components.host.slideItemRow}>
                            <button
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                    onSelect(index);
                                    asideRef.current?.focus();
                                }}
                                className={components.host.slideSelectBtn}
                            >
                                <span className={components.host.slideIndex}>{String(index + 1).padStart(2, '0')}</span>
                                <div
                                    className={cx(
                                        components.host.slideThumb,
                                        activeQuestionIndex === index ? components.host.slideThumbActive : components.host.slideThumbIdle,
                                    )}
                                >
                                    <div className={components.host.slideThumbAccent} />
                                    <div className={components.host.slideThumbPreview}>
                                        <div className={components.host.slideBarStrong} />
                                        <div className={components.host.slideBarSoft} />
                                    </div>
                                    <div className={components.host.slideMiniGrid}>
                                        <div className={components.host.slideMiniCell} />
                                        <div className={components.host.slideMiniCell} />
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                ))}

                {!questions.length ? (
                    <div className={components.host.slideEmptyState}>
                        No slides yet. Press Ctrl+Enter to add your first slide.
                    </div>
                ) : null}
            </div>
        </aside>
    );
};

export default SlideList;

