import { useMemo, useState } from 'react';
import { Loader2, Sparkles, X, RefreshCw, Save, Check } from 'lucide-react';
import { modalStyles } from '../../../styles/layoutStyles';

import { cardStyles } from '../../../styles/cardStyles';
import { controlStyles, formStyles, textStyles, panelStyles, buttonStyles, components, cx } from '../../../styles/index';

const DISTRIBUTION_STEP = 5;
const DISTRIBUTION_OPTIONS = Array.from({ length: 21 }, (_, index) => index * DISTRIBUTION_STEP);

const snapToDistributionStep = (value) => {
    const numericValue = Number(value) || 0;
    return Math.max(0, Math.min(100, Math.round(numericValue / DISTRIBUTION_STEP) * DISTRIBUTION_STEP));
};

const getDistributionOrder = (key) => {
    if (key === 'hard') return ['easy', 'medium'];
    if (key === 'medium') return ['easy', 'hard'];
    return ['hard', 'medium'];
};

const rebalanceDistribution = (distribution, key, value) => {
    const next = {
        easy: Number(distribution.easy) || 0,
        medium: Number(distribution.medium) || 0,
        hard: Number(distribution.hard) || 0,
    };

    next[key] = snapToDistributionStep(value);

    let delta = next.easy + next.medium + next.hard - 100;
    if (delta === 0) return next;

    for (const field of getDistributionOrder(key)) {
        if (delta === 0) break;

        if (delta > 0) {
            const reduction = Math.min(next[field], delta);
            next[field] -= reduction;
            delta -= reduction;
        } else {
            const increase = Math.min(100 - next[field], Math.abs(delta));
            next[field] += increase;
            delta += increase;
        }
    }

    return next;
};

const AIGeneratorModal = ({
    open,
    quizId,
    onClose,
    onGenerate,
    onSave,
}) => {
    const [topic, setTopic] = useState('');
    const [count, setCount] = useState(5);
    const [distribution, setDistribution] = useState({ easy: 100, medium: 0, hard: 0 });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [generated, setGenerated] = useState([]);
    const [meta, setMeta] = useState(null);
    const [activeTab, setActiveTab] = useState('preview');
    const [copiedPrompt, setCopiedPrompt] = useState(false);
    const [copiedJson, setCopiedJson] = useState(false);

    const distributionTotal = Number(distribution.easy) + Number(distribution.medium) + Number(distribution.hard);
    const isDistributionValid = distributionTotal === 100;

    const canGenerate = useMemo(() => (
        topic.trim().length > 1
        && count >= 1
        && count <= 20
        && isDistributionValid
    ), [topic, count, isDistributionValid]);

    const promptText = useMemo(() => {
        const topicValue = topic.trim() || '[enter topics]';
        const easyValue = Number(distribution.easy) || 100;
        const mediumValue = Number(distribution.medium) || 0;
        const hardValue = Number(distribution.hard) || 0;
        const totalQuestionsValue = Number(count) || 5;

        const buildSampleOutput = () => {
            const difficultyCounts = [
                { key: 'easy', count: Math.round((totalQuestionsValue * easyValue) / 100) },
                { key: 'medium', count: Math.round((totalQuestionsValue * mediumValue) / 100) },
                { key: 'hard', count: Math.round((totalQuestionsValue * hardValue) / 100) },
            ];

            let totalAssigned = difficultyCounts.reduce((sum, item) => sum + item.count, 0);
            const difficultyOrder = ['easy', 'medium', 'hard'];

            while (totalAssigned < totalQuestionsValue) {
                const target = difficultyCounts.find((item) => item.key === difficultyOrder[totalAssigned % difficultyOrder.length]);
                if (target) {
                    target.count += 1;
                    totalAssigned += 1;
                } else {
                    break;
                }
            }

            const difficultySequence = difficultyCounts.flatMap((item) => Array.from({ length: item.count }, () => item.key));

            return Array.from({ length: totalQuestionsValue }, (_, index) => {
                const difficulty = difficultySequence[index] || 'easy';
                const questionNumber = index + 1;
                const optionsByDifficulty = {
                    easy: [
                        `${topicValue} basic concept`,
                        `${topicValue} unrelated term`,
                        `${topicValue} incorrect statement`,
                        `${topicValue} random distractor`,
                    ],
                    medium: [
                        `${topicValue} with practical example`,
                        `${topicValue} partially correct interpretation`,
                        `${topicValue} common misconception`,
                        `${topicValue} edge-case distractor`,
                    ],
                    hard: [
                        `${topicValue} scenario with constraints`,
                        `${topicValue} advanced but incorrect tradeoff`,
                        `${topicValue} subtle edge-case failure`,
                        `${topicValue} high-level distractor`,
                    ],
                };

                const sampleOptions = optionsByDifficulty[difficulty] || optionsByDifficulty.easy;
                const correctOption = Math.floor(Math.random() * 4);
                return {
                    text: `Question ${questionNumber} about ${topicValue}`,
                    question: `Question ${questionNumber} about ${topicValue}`,
                    options: sampleOptions,
                    correctOption,
                    correctAnswer: sampleOptions[correctOption],
                    timeLimit: 15,
                    shuffleOptions: false,
                    questionType: 'multiple-choice',
                    mediaUrl: null,
                    difficulty,
                    explanation: `Sample explanation for question ${questionNumber} about ${topicValue}.`,
                };
            });
        };

        return JSON.stringify({
            instruction: 'Create a quiz question set in JSON format with high-quality multiple-choice questions.',
            rules: {
                correctOptionDistribution: "Distribute correctOption randomly across indexes 0-3. Avoid repeating the same index consecutively.",
                correctAnswerValidity: "The correctAnswer must always be factually correct and must match the correctOption.",
                distractorQuality: "All incorrect options must be plausible but clearly incorrect. Avoid generic placeholders like 'random distractor'.",
                noPattern: true,
                balancedDifficulty: true
            },
            input: {
                topics: topicValue,
                easy: easyValue,
                medium: mediumValue,
                hard: hardValue,
                totalQuestions: totalQuestionsValue,
            },
            defaults: {
                questionType: 'multiple-choice',
                timeLimit: 15,
                shuffleOptions: false,
                mediaUrl: null,
                difficulty: 'easy',
                explanation: '',
            },
            sampleOutput: buildSampleOutput(),
            outputFields: [
                'text',
                'question',
                'options',
                'correctOption',
                'correctAnswer',
                'timeLimit',
                'shuffleOptions',
                'questionType',
                'mediaUrl',
                'difficulty',
                'explanation',
            ],
            responseFormat: 'Return valid JSON only. Do not wrap the response in markdown.',
        }, null, 2);
    }, [topic, distribution.easy, distribution.medium, distribution.hard, count]);

    if (!open) return null;

    const handleDistributionChange = (key, value) => {
        setDistribution((prev) => rebalanceDistribution(prev, key, value));
    };

    const handleCopyJSON = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(generated, null, 2));
            setCopiedJson(true);
            setTimeout(() => setCopiedJson(false), 2000);
        } catch {
            setError('Failed to copy JSON');
        }
    };

    const handleCopyPrompt = async () => {
        try {
            await navigator.clipboard.writeText(promptText);
            setCopiedPrompt(true);
            setTimeout(() => setCopiedPrompt(false), 2000);
        } catch {
            setError('Failed to copy prompt');
        }
    };

    const handleGenerate = async () => {
        if (!canGenerate) return;
        setLoading(true);
        setError('');
        try {
            const result = await onGenerate({
                topic: topic.trim(),
                count: Number(count),
                distribution: {
                    easy: Number(distribution.easy),
                    medium: Number(distribution.medium),
                    hard: Number(distribution.hard),
                },
            });
            setGenerated(result?.questions || []);
            setMeta(result?.meta || null);
            setActiveTab('preview');
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Failed to generate questions');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!generated.length) return;
        setSaving(true);
        setError('');
        try {
            await onSave({ quizId, questions: generated });
            onClose();
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Failed to save generated questions');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={modalStyles.overlayTop}>
            <div className={modalStyles.panelXl}>
                <div className={modalStyles.headerRow}>
                    <div>
                        <h3 className={textStyles.titleLg}>AI Quiz Generator</h3>
                        <p className={cx(components.analytics.metricCaption, textStyles.subtitle)}>Generate MCQs by topic and insert directly into this quiz.</p>
                    </div>
                    <button type="button" onClick={onClose} className={controlStyles.iconButtonLg} aria-label="Close AI generator dialog">
                        <X size={18} />
                    </button>
                </div>

                <div className={modalStyles.formGrid}>
                    <div className={modalStyles.formGridWide}>
                        <label className={formStyles.label}>Topics</label>
                        <input
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            className={formStyles.input}
                            placeholder="Enter topics, e.g. JavaScript closures, arrays, scope"
                        />
                    </div>
                    <div>
                        <label className={formStyles.label}>Easy (%)</label>
                        <select value={distribution.easy} onChange={(e) => handleDistributionChange('easy', e.target.value)} className={formStyles.select}>
                            {DISTRIBUTION_OPTIONS.map((option) => (
                                <option key={`easy-${option}`} value={option}>
                                    {option}%
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={formStyles.label}>Medium (%)</label>
                        <select value={distribution.medium} onChange={(e) => handleDistributionChange('medium', e.target.value)} className={formStyles.select}>
                            {DISTRIBUTION_OPTIONS.map((option) => (
                                <option key={`medium-${option}`} value={option}>
                                    {option}%
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={formStyles.label}>Hard (%)</label>
                        <select value={distribution.hard} onChange={(e) => handleDistributionChange('hard', e.target.value)} className={formStyles.select}>
                            {DISTRIBUTION_OPTIONS.map((option) => (
                                <option key={`hard-${option}`} value={option}>
                                    {option}%
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={formStyles.label}>Count</label>
                        <input type="number" min={1} max={20} value={count} onChange={(e) => setCount(Number(e.target.value || 1))} className={formStyles.input} />
                    </div>
                </div>

                <div className={modalStyles.contentSectionScroll}>
                    <div className={panelStyles.mutedBox}>
                        <div className={components.host.aiPromptHeader}>
                            <div>
                                <p className={textStyles.metaLabel}>Copy-ready prompt</p>
                                <p className={cx(components.analytics.metricCaption, textStyles.subtitle)}>Use this prompt in any AI tool. The placeholders update from the fields above.</p>
                            </div>
                            <button onClick={handleCopyPrompt} className={cx(buttonStyles.secondary, components.host.aiPromptCopyBtn, "transition-all duration-200", copiedPrompt && "bg-emerald-50 text-emerald-600 border-emerald-200 scale-95")}>
                                {copiedPrompt ? (
                                    <>
                                        <Check size={14} className="mr-1 inline" /> Copied!
                                    </>
                                ) : (
                                    'Copy Prompt'
                                )}
                            </button>
                        </div>
                        <pre className={components.host.aiPromptCode}>{promptText}</pre>
                    </div>

                    <div className={isDistributionValid ? panelStyles.successBox : panelStyles.errorBox}>
                        Distribution Total: {distributionTotal}% {isDistributionValid ? '(valid)' : '(must be 100%)'}
                    </div>

                    {meta && (
                        <div className={panelStyles.infoBox}>
                            Generated mix {'->'} Easy: {meta.easy} | Medium: {meta.medium} | Hard: {meta.hard}
                        </div>
                    )}

                    {error && (
                        <div className={panelStyles.errorBox}>
                            {error}
                        </div>
                    )}

                    {loading && (
                        <div className={modalStyles.stackSm}>
                            <div className={panelStyles.loadingBox}>
                                <Loader2 size={16} className={components.host.spin} /> Generating questions...
                            </div>
                            {[1, 2, 3].map((n) => (
                                <div key={n} className={components.host.aiSkeleton} />
                            ))}
                        </div>
                    )}

                    {!loading && generated.length > 0 && (
                        <div className={controlStyles.tabWrap}>
                            <button onClick={() => setActiveTab('preview')} className={cx(controlStyles.tabBtn, activeTab === 'preview' ? buttonStyles.primary : controlStyles.segmentedIdle)}>Preview</button>
                            <button onClick={() => setActiveTab('json')} className={cx(controlStyles.tabBtn, activeTab === 'json' ? buttonStyles.primary : controlStyles.segmentedIdle)}>JSON</button>
                        </div>
                    )}

                    {!loading && generated.length === 0 && (
                        <div className={panelStyles.mutedBox}>
                            Generated questions preview appears here.
                        </div>
                    )}

                    {!loading && activeTab === 'preview' && generated.map((question, index) => (
                        <div key={`${question.text}-${index}`} className={cx(cardStyles.base, components.host.aiQuestionCardPad)}>
                            <div className={components.host.aiQuestionHeader}>
                                <p className={textStyles.bodyStrong}>{index + 1}. {question.text}</p>
                                <span className={components.host.aiQuestionDifficulty}>{question.difficulty || 'mixed'}</span>
                            </div>
                            <div className={components.host.aiOptionGrid}>
                                {question.options.map((option) => {
                                    const isCorrect = option === question.correctAnswer;
                                    return (
                                        <div
                                            key={`${question.text}-${option}`}
                                            className={cx(
                                                components.host.aiOptionBase,
                                                isCorrect ? components.host.aiOptionCorrect : components.host.aiOptionWrong,
                                            )}
                                        >
                                            {option}
                                        </div>
                                    );
                                })}
                            </div>
                            {question.explanation && (
                                <p className={cx(components.host.aiExplainMargin, textStyles.captionStrong)}>
                                    <span className={components.host.aiExplainLabel}>Explanation:</span> {question.explanation}
                                </p>
                            )}
                        </div>
                    ))}

                    {!loading && activeTab === 'json' && generated.length > 0 && (
                        <div className={modalStyles.stackMd}>
                            <button onClick={handleCopyJSON} className={cx(buttonStyles.secondary, components.host.aiPromptCopyBtn, "transition-all duration-200", copiedJson && "bg-emerald-50 text-emerald-600 border-emerald-200 scale-95")}>
                                {copiedJson ? (
                                    <>
                                        <Check size={14} className="mr-1 inline" /> Copied JSON!
                                    </>
                                ) : (
                                    'Copy JSON'
                                )}
                            </button>
                            <pre className={panelStyles.codePanel}>{JSON.stringify(generated, null, 2)}</pre>
                        </div>
                    )}
                </div>

                <div className={modalStyles.footerRight}>
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={!canGenerate || loading}
                        className={cx(buttonStyles.primary, components.host.aiGenerateBtn)}
                    >
                        {loading ? <Loader2 size={14} className={components.host.spin} /> : <Sparkles size={14} />}
                        Generate
                    </button>
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={!generated.length || loading}
                        className={cx(buttonStyles.secondary, components.host.aiActionBtn, components.host.aiPromptCopyBtn)}
                    >
                        <RefreshCw size={14} /> Regenerate
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!generated.length || saving}
                        className={cx(buttonStyles.success, components.host.aiGenerateBtn)}
                    >
                        {saving ? <Loader2 size={14} className={components.host.spin} /> : <Save size={14} />}
                        Save To Quiz
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIGeneratorModal;

