import { Shuffle, Trash2, Zap } from 'lucide-react';
import { buttonStyles } from '../../styles/buttonStyles';
import { textStyles, formStyles } from '../../styles/commonStyles';
import { components } from '../../styles/components';
import { cx } from '../../styles/theme';

const ConfigPanel = ({
    activeQuiz,
    activeQuestion,
    questions,
    onToggleShuffleOptions,
    onToggleShuffleQuestions,
    onApplyToAllSlides,
    onTimeLimitChange,
    onQuestionTypeChange,
    onCorrectOptionChange,
    onDeleteCurrentSlide,
}) => (
    <aside className={components.organizer.configAside}>
        <section className={components.organizer.configSection}>
            <h3 className={cx(textStyles.metaLabel, components.organizer.configTitle)}>Configuration</h3>

            <div className={components.organizer.configStack}>
                <button
                    onClick={onToggleShuffleOptions}
                    disabled={!activeQuestion}
                    className={cx(
                        components.organizer.configToggleBtn,
                        activeQuestion?.shuffleOptions
                            ? components.organizer.configToggleOnSuccess
                            : components.organizer.configToggleOff,
                    )}
                >
                    <span className={components.organizer.configToggleLabel}>Shuffle Options</span>
                    <span className={cx(
                        components.organizer.configSwitchTrack,
                        activeQuestion?.shuffleOptions ? components.organizer.configSwitchTrackOnSuccess : components.organizer.configSwitchTrackOff,
                    )}>
                        <span className={cx(
                            components.organizer.configSwitchThumb,
                            activeQuestion?.shuffleOptions ? components.organizer.configSwitchThumbOn : components.organizer.configSwitchThumbOff,
                        )} />
                    </span>
                </button>

                <p className={cx(textStyles.tinyMuted, components.organizer.configHint)}>
                    Applies to this question only
                </p>

                <button
                    onClick={onToggleShuffleQuestions}
                    className={cx(
                        components.organizer.configToggleBtn,
                        activeQuiz.shuffleQuestions
                            ? components.organizer.configToggleOnWarning
                            : components.organizer.configToggleOff,
                    )}
                >
                    <span className={components.organizer.configToggleLabel}>Shuffle All Questions</span>
                    <span className={cx(
                        components.organizer.configSwitchTrack,
                        activeQuiz.shuffleQuestions ? components.organizer.configSwitchTrackOnWarning : components.organizer.configSwitchTrackOff,
                    )}>
                        <span className={cx(
                            components.organizer.configSwitchThumb,
                            activeQuiz.shuffleQuestions ? components.organizer.configSwitchThumbOn : components.organizer.configSwitchThumbOff,
                        )} />
                    </span>
                </button>
            </div>

            <div className={components.organizer.configField}>
                <label className={formStyles.label}>Time Limit</label>
                <select
                    className={formStyles.select}
                    value={activeQuestion?.timeLimit || 10}
                    onChange={(e) => onTimeLimitChange(Number(e.target.value))}
                >
                    {[10, 15, 20, 30, 45, 60].map((seconds) => (
                        <option key={seconds} value={seconds}>{seconds} Seconds</option>
                    ))}
                </select>
            </div>

            <button
                onClick={onApplyToAllSlides}
                disabled={!activeQuestion || questions.length < 2}
                className={cx(buttonStyles.secondary, components.organizer.configApplyBtn)}
                title="This will overwrite all slides with current Time Limit, Question Type, and Correct Answer"
            >
                <Shuffle size={14} /> Apply to All Slides
            </button>

            <div className={components.organizer.configDividerTop}>
                <div className={components.organizer.configField}>
                    <label className={formStyles.label}>Question Type</label>
                    <div className={components.organizer.configSelectWrap}>
                        <select
                            className={cx(formStyles.select, components.organizer.configSelectNative)}
                            value={activeQuestion?.questionType || 'multiple-choice'}
                            onChange={(e) => onQuestionTypeChange(e.target.value)}
                        >
                            <option value="multiple-choice">Multiple Choice</option>
                        </select>
                        <div className={components.organizer.configSelectIconWrap}>
                            <Zap size={14} className={components.organizer.iconAccent} />
                        </div>
                    </div>
                </div>

                <div className={components.organizer.configField}>
                    <label className={formStyles.label}>Correct Answer</label>
                    <select
                        className={formStyles.select}
                        value={activeQuestion?.correctOption ?? ''}
                        onChange={(e) => onCorrectOptionChange(Number(e.target.value))}
                    >
                        <option value="">Select correct index</option>
                        {activeQuestion?.options.map((option, index) => (
                            <option key={index} value={index}>Option {index + 1}: {option?.substring(0, 20) || 'Untitled'}...</option>
                        ))}
                    </select>
                </div>
            </div>
        </section>

        <div className={components.organizer.configFooter}>
            <button
                onClick={onDeleteCurrentSlide}
                className={cx(buttonStyles.danger, components.organizer.configDeleteBtn)}
            >
                <Trash2 size={16} /> DELETE SLIDE
            </button>
        </div>
    </aside>
);

export default ConfigPanel;
