import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { components } from '../../styles/components';
import { cx } from '../../styles/theme';

const QuestionCanvas = ({
    activeQuestion,
    activeQuestionIndex = 0,
    totalQuestions = 0,
    onQuestionTextChange,
    onOptionChange,
    isEditing = false,
    onEnterEdit,
    onExitEdit,
}) => {
    const questionInputRef = useRef(null);
    const optionInputRefs = useRef([]);
    const [editingOptionIndex, setEditingOptionIndex] = useState(null);
    const questionNumber = Math.max(1, (activeQuestionIndex || 0) + 1);
    const totalCount = Math.max(0, totalQuestions || 0);

    useEffect(() => {
        if (!isEditing) {
            setEditingOptionIndex(null);
            return;
        }

        if (editingOptionIndex !== null) {
            optionInputRefs.current[editingOptionIndex]?.focus();
            return;
        }

        questionInputRef.current?.focus();
    }, [isEditing, editingOptionIndex]);

    return (
        <main className={components.organizer.canvasMain}>
            <div className={components.organizer.canvasCard}>
                <div className={components.organizer.canvasHeader}>
                    <div className={components.organizer.canvasHeaderLeft}>
                        <span className={components.organizer.canvasSlidePill}>
                            Slide {questionNumber} of {totalCount}
                        </span>
                    </div>
                    <div className={components.organizer.canvasHeaderIcon}>
                        <Zap className={components.organizer.iconAccent} size={24} />
                    </div>
                </div>

                {activeQuestion ? (
                    <div className={components.organizer.canvasContent}>
                        <div className={components.organizer.canvasRow}>
                            <div className={components.organizer.canvasBadgeCol}>
                                <div className={components.organizer.canvasBadge}>
                                    Q{questionNumber}
                                </div>
                            </div>

                            <div className={components.organizer.canvasQuestionCol}>
                                {isEditing ? (
                                    <textarea
                                        ref={questionInputRef}
                                        className={components.organizer.canvasQuestionInput}
                                        placeholder="Type your question here..."
                                        value={activeQuestion.text}
                                        onChange={(e) => onQuestionTextChange(e.target.value)}
                                        onBlur={() => onExitEdit?.()}
                                    />
                                ) : (
                                    <button
                                        type="button"
                                        onClick={onEnterEdit}
                                        className="w-full rounded-xl border border-dashed theme-border px-3 py-3 text-left text-lg font-semibold theme-text-primary transition-colors hover:theme-surface-soft"
                                    >
                                        {activeQuestion.text || 'Click to edit question'}
                                    </button>
                                )}

                                <div className={components.organizer.canvasOptionsGrid}>
                                    {(activeQuestion.options || []).map((option, index) => {
                                        const isCorrect = activeQuestion.correctOption === index;

                                        return (
                                            <div
                                                key={index}
                                                className={components.organizer.canvasOptionCard}
                                            >
                                                <div
                                                    className={cx(
                                                        components.organizer.canvasOptionButton,
                                                        isCorrect
                                                            ? components.organizer.canvasOptionButtonCorrect
                                                            : components.organizer.canvasOptionButtonIdle,
                                                    )}
                                                >
                                                    <span
                                                        className={cx(
                                                            components.organizer.canvasOptionLetter,
                                                            isCorrect ? components.organizer.canvasOptionLetterCorrect : '',
                                                        )}
                                                    >
                                                        {String.fromCharCode(65 + index)}
                                                    </span>
                                                    <div className={components.organizer.canvasOptionContent}>
                                                        {isEditing ? (
                                                            <input
                                                                ref={(node) => {
                                                                    optionInputRefs.current[index] = node;
                                                                }}
                                                                type="text"
                                                                className={components.organizer.canvasOptionInput}
                                                                placeholder={`Option ${index + 1}`}
                                                                value={option}
                                                                onChange={(e) => onOptionChange(index, e.target.value)}
                                                                onFocus={() => {
                                                                    onEnterEdit?.();
                                                                    setEditingOptionIndex(index);
                                                                }}
                                                            />
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditingOptionIndex(index);
                                                                    onEnterEdit?.();
                                                                }}
                                                                className="w-full text-left text-sm theme-text-primary"
                                                            >
                                                                {option || `Option ${index + 1}`}
                                                            </button>
                                                        )}
                                                        {isCorrect ? (
                                                            <span className={components.organizer.canvasOptionState}>Correct</span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={components.organizer.canvasEmpty}>
                        <AlertCircle size={56} />
                        <p className={components.organizer.canvasEmptyText}>
                            No slide selected <br />
                            <span className={components.organizer.canvasEmptySub}>
                                Add a question to get started
                            </span>
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
};

export default QuestionCanvas;