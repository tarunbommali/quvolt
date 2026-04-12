import { AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { components } from '../../styles/components';
import { cx } from '../../styles/theme';

const QuestionCanvas = ({
    activeQuestion,
    activeQuestionIndex = 0,
    totalQuestions = 0,
    onQuestionTextChange,
    onOptionChange,
}) => {
    const questionNumber = Math.max(1, (activeQuestionIndex || 0) + 1);
    const totalCount = Math.max(0, totalQuestions || 0);

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
                                <textarea
                                    className={components.organizer.canvasQuestionInput}
                                    placeholder="Type your question here..."
                                    value={activeQuestion.text}
                                    onChange={(e) => onQuestionTextChange(e.target.value)}
                                />

                                <div className={components.organizer.canvasOptionsGrid}>
                                    {activeQuestion.options.map((option, index) => {
                                        const isCorrect = activeQuestion.correctOption === index;

                                        return (
                                            <div
                                                key={index}
                                                className={components.organizer.canvasOptionCard}
                                            >
                                                <div
                                                    className={cx(
                                                        components.organizer.canvasOptionBadge,
                                                        isCorrect
                                                            ? components.organizer.canvasOptionBadgeCorrect
                                                            : components.organizer.canvasOptionBadgeIdle,
                                                    )}
                                                >
                                                    <span className={components.organizer.canvasOptionBadgeLetter}>
                                                        {String.fromCharCode(65 + index)}
                                                    </span>
                                                    {isCorrect && <CheckCircle2 size={13} />}
                                                </div>

                                                <button
                                                    onClick={(e) => e.preventDefault()}
                                                    className={cx(
                                                        components.organizer.canvasOptionButton,
                                                        isCorrect
                                                            ? components.organizer.canvasOptionButtonCorrect
                                                            : components.organizer.canvasOptionButtonIdle,
                                                    )}
                                                >
                                                    <input
                                                        type="text"
                                                        className={components.organizer.canvasOptionInput}
                                                        placeholder={`Option ${index + 1}`}
                                                        value={option}
                                                        onChange={(e) => onOptionChange(index, e.target.value)}
                                                    />
                                                </button>
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

            <div className={components.organizer.canvasFooter}>
                WYSIWYG Editor // Canvas Phase 1
            </div>
        </main>
    );
};

export default QuestionCanvas;