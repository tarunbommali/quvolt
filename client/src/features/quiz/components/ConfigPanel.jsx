import { Shuffle, Trash2, Zap } from 'lucide-react';
import { buttonStyles, textStyles, components, cx } from '../../../styles/index';

const ConfigPanel = ({
    mobile = false,
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
    <aside className={mobile ? 'space-y-4 rounded-2xl border theme-border theme-surface p-4 shadow-sm' : components.host.configAside}>
        <div className={components.host.configHeader}>
            <p className={components.host.configTitle}>{mobile ? 'Settings' : 'Configuration'}</p>
        </div>
        <section className={components.host.configSection}>
            <h3 className={cx(textStyles.metaLabel, components.host.configTitle, 'sr-only')}>{mobile ? 'Settings' : 'Configuration'}</h3>

            <div className={components.host.configFieldGroupTop}>
                <div className={components.host.configField}>
                    <label className={components.host.configFieldLabel}>Question Type</label>
                    <div className={components.host.configSelectWrap}>
                        <select
                            className={cx(components.host.configFieldSelect, components.host.configSelectNative)}
                            value={activeQuestion?.questionType || 'multiple-choice'}
                            onChange={(e) => onQuestionTypeChange(e.target.value)}
                        >
                            <option value="multiple-choice">Multiple Choice</option>
                        </select>
                        <div className={components.host.configSelectIconWrap}>
                            <Zap size={14} className={components.host.iconAccent} />
                        </div>
                    </div>
                </div>

                <div className={components.host.configField}>
                    <label className={components.host.configFieldLabel}>Correct Answer</label>
                    <select
                        className={components.host.configFieldSelect}
                        value={activeQuestion?.correctOption ?? ''}
                        onChange={(e) => onCorrectOptionChange(Number(e.target.value))}
                    >
                        <option value="">Select correct index</option>
                        {(activeQuestion?.options || []).map((option, index) => (
                            <option key={index} value={index}>Option {index + 1}: {option?.substring(0, 20) || 'Untitled'}...</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className={components.host.configStack}>
                <button
                    onClick={onToggleShuffleOptions}
                    disabled={!activeQuestion}
                    className={cx(
                        components.host.configToggleBtn,
                        activeQuestion?.shuffleOptions
                            ? components.host.configToggleOnSuccess
                            : components.host.configToggleOff,
                    )}
                >
                    <span>
                        <span className={components.host.configToggleLabel}>Shuffle Options</span>
                    </span>
                    <span className={cx(
                        components.host.configSwitchTrack,
                        activeQuestion?.shuffleOptions ? components.host.configSwitchTrackOnSuccess : components.host.configSwitchTrackOff,
                    )}>
                        <span className={cx(
                            components.host.configSwitchThumb,
                            activeQuestion?.shuffleOptions ? components.host.configSwitchThumbOn : components.host.configSwitchThumbOff,
                        )} />
                    </span>
                </button>
            </div>

            <div className={components.host.configField}>
                <label className={components.host.configFieldLabel}>Time Limit</label>
                <select
                    className={components.host.configFieldSelect}
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
                className={cx(buttonStyles.base, buttonStyles.secondary, components.host.configApplyBtn)}
                title="This will overwrite all slides with current Time Limit, Question Type, and Correct Answer"
            >
                <Shuffle size={14} /> Apply to All Slides
            </button>

            <button
                onClick={onToggleShuffleQuestions}
                className={cx(
                    components.host.configToggleBtn,
                    activeQuiz.shuffleQuestions
                        ? components.host.configToggleOnWarning
                        : components.host.configToggleOff,
                )}
            >
                <span>
                    <span className={components.host.configToggleLabel}>Shuffle All Questions</span>
                </span>
                <span className={cx(
                    components.host.configSwitchTrack,
                    activeQuiz.shuffleQuestions ? components.host.configSwitchTrackOnWarning : components.host.configSwitchTrackOff,
                )}>
                    <span className={cx(
                        components.host.configSwitchThumb,
                        activeQuiz.shuffleQuestions ? components.host.configSwitchThumbOn : components.host.configSwitchThumbOff,
                    )} />
                </span>
            </button>
        </section>

        <div className={components.host.configFooter}>
            <button
                onClick={onDeleteCurrentSlide}
                className={cx(buttonStyles.base, buttonStyles.danger, components.host.configDeleteBtn)}
            >
                <Trash2 size={16} /> DELETE SLIDE
            </button>
        </div>
    </aside>
);

export default ConfigPanel;

