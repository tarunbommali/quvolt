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
        <main className={components.host.canvasMain}>
            <div className={components.host.canvasCard}>
                <div className={components.host.canvasHeader}>
                    <div className={components.host.canvasHeaderLeft}>
                        <span className={components.host.canvasSlidePill}>
                            Slide {questionNumber} of {totalCount}
                        </span>
                    </div>
                    <div className={components.host.canvasHeaderIcon}>
                        <Zap className={components.host.iconAccent} size={24} />
                    </div>
                </div>

                {activeQuestion ? (
                    <div className={components.host.canvasContent}>
                        <div className={components.host.canvasRow}>
                            <div className={components.host.canvasBadgeCol}>
                                <div className={components.host.canvasBadge}>
                                    Q{questionNumber}
                                </div>
                            </div>

                            <div className={components.host.canvasQuestionCol}>
                                {isEditing ? (
                                    <textarea
                                        ref={questionInputRef}
                                        className={components.host.canvasQuestionInput}
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

                                <div className={components.host.canvasOptionsGrid}>
                                    {(activeQuestion.options || []).map((option, index) => {
                                        const isCorrect = activeQuestion.correctOption === index;

                                        return (
                                            <div
                                                key={index}
                                                className={components.host.canvasOptionCard}
                                            >
                                                <div
                                                    className={cx(
                                                        components.host.canvasOptionButton,
                                                        isCorrect
                                                            ? components.host.canvasOptionButtonCorrect
                                                            : components.host.canvasOptionButtonIdle,
                                                    )}
                                                >
                                                    <span
                                                        className={cx(
                                                            components.host.canvasOptionLetter,
                                                            isCorrect ? components.host.canvasOptionLetterCorrect : '',
                                                        )}
                                                    >
                                                        {String.fromCharCode(65 + index)}
                                                    </span>
                                                    <div className={components.host.canvasOptionContent}>
                                                        {isEditing ? (
                                                            <input
                                                                ref={(node) => {
                                                                    optionInputRefs.current[index] = node;
                                                                }}
                                                                type="text"
                                                                className={components.host.canvasOptionInput}
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
                                                            <span className={components.host.canvasOptionState}>Correct</span>
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
                    <div className={components.host.canvasEmpty}>
                        <AlertCircle size={56} />
                        <p className={components.host.canvasEmptyText}>
                            No slide selected <br />
                            <span className={components.host.canvasEmptySub}>
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