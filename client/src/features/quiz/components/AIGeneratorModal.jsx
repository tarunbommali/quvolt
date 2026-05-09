import { useMemo, useState } from 'react';
import { Loader2, Sparkles, RefreshCw, Save, Check } from 'lucide-react';
import Modal, { ModalShell, ModalHeader, ModalBody, ModalFooter, ModalButton } from '../../../components/common/ui/Modal';
import { panelStyles, buttonStyles, components, cx } from '../../../styles/index';

// ─── Difficulty distribution helpers (unchanged) ────────────────────────────

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

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * AIGeneratorModal
 *
 * Generates MCQs by topic using an AI endpoint and lets the host save them
 * directly into the active quiz.
 *
 * All state and handler logic is unchanged from the original.
 * Only the JSX structure uses Modal / ModalShell / ModalHeader / ModalBody / ModalFooter.
 */
const AIGeneratorModal = ({
    open,
    quizId,
    onClose,
    onGenerate,
    onSave,
}) => {
    // ── State (identical to original) ──────────────────────────────────────
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

    // ── Prompt builder (identical to original) ─────────────────────────────
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
                if (target) { target.count += 1; totalAssigned += 1; } else { break; }
            }

            const difficultySequence = difficultyCounts.flatMap((item) => Array.from({ length: item.count }, () => item.key));

            return Array.from({ length: totalQuestionsValue }, (_, index) => {
                const difficulty = difficultySequence[index] || 'easy';
                const qNum = index + 1;
                const optsByDiff = {
                    easy: [`${topicValue} basic concept`, `${topicValue} unrelated term`, `${topicValue} incorrect statement`, `${topicValue} random distractor`],
                    medium: [`${topicValue} with practical example`, `${topicValue} partially correct interpretation`, `${topicValue} common misconception`, `${topicValue} edge-case distractor`],
                    hard: [`${topicValue} scenario with constraints`, `${topicValue} advanced but incorrect tradeoff`, `${topicValue} subtle edge-case failure`, `${topicValue} high-level distractor`],
                };
                const opts = optsByDiff[difficulty] || optsByDiff.easy;
                const correctOption = Math.floor(Math.random() * 4);
                return {
                    text: `Question ${qNum} about ${topicValue}`, question: `Question ${qNum} about ${topicValue}`,
                    options: opts, correctOption, correctAnswer: opts[correctOption],
                    timeLimit: 15, shuffleOptions: false, questionType: 'multiple-choice',
                    mediaUrl: null, difficulty, explanation: `Sample explanation for question ${qNum} about ${topicValue}.`,
                };
            });
        };

        return JSON.stringify({
            instruction: 'Create a quiz question set in JSON format with high-quality multiple-choice questions.',
            rules: {
                correctOptionDistribution: 'Distribute correctOption randomly across indexes 0-3. Avoid repeating the same index consecutively.',
                correctAnswerValidity: 'The correctAnswer must always be factually correct and must match the correctOption.',
                distractorQuality: 'All incorrect options must be plausible but clearly incorrect. Avoid generic placeholders like \'random distractor\'.',
                noPattern: true, balancedDifficulty: true,
            },
            input: { topics: topicValue, easy: easyValue, medium: mediumValue, hard: hardValue, totalQuestions: totalQuestionsValue },
            defaults: { questionType: 'multiple-choice', timeLimit: 15, shuffleOptions: false, mediaUrl: null, difficulty: 'easy', explanation: '' },
            sampleOutput: buildSampleOutput(),
            outputFields: ['text', 'question', 'options', 'correctOption', 'correctAnswer', 'timeLimit', 'shuffleOptions', 'questionType', 'mediaUrl', 'difficulty', 'explanation'],
            responseFormat: 'Return valid JSON only. Do not wrap the response in markdown.',
        }, null, 2);
    }, [topic, distribution.easy, distribution.medium, distribution.hard, count]);

    // ── Handlers (identical to original) ───────────────────────────────────
    const handleDistributionChange = (key, value) => {
        setDistribution((prev) => rebalanceDistribution(prev, key, value));
    };

    const handleCopyJSON = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(generated, null, 2));
            setCopiedJson(true);
            setTimeout(() => setCopiedJson(false), 2000);
        } catch { setError('Failed to copy JSON'); }
    };

    const handleCopyPrompt = async () => {
        try {
            await navigator.clipboard.writeText(promptText);
            setCopiedPrompt(true);
            setTimeout(() => setCopiedPrompt(false), 2000);
        } catch { setError('Failed to copy prompt'); }
    };

    const handleGenerate = async () => {
        if (!canGenerate) return;
        setLoading(true);
        setError('');
        try {
            const result = await onGenerate({
                topic: topic.trim(),
                count: Number(count),
                distribution: { easy: Number(distribution.easy), medium: Number(distribution.medium), hard: Number(distribution.hard) },
            });
            setGenerated(result?.questions || []);
            setMeta(result?.meta || null);
            setActiveTab('preview');
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Failed to generate questions');
        } finally { setLoading(false); }
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
        } finally { setSaving(false); }
    };

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <Modal open={open} onClose={onClose}>
            <ModalShell>
                <ModalHeader
                    title="AI Quiz Generator"
                    subtitle="Generate MCQs by topic and insert directly into this quiz."
                    onClose={onClose}
                    closeLabel="Close AI generator dialog"
                />

                <ModalBody>
                    {/* ── Input row ──────────────────────────────────────── */}
                    <div className="space-y-3">
                        {/* Topic */}
                        <div>
                            <label className="block text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                                Topics
                            </label>
                            <input
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-slate-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors"
                                placeholder="Enter topics, e.g. JavaScript closures, arrays, scope"
                                autoFocus
                            />
                        </div>

                        {/* Difficulty + Count row */}
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { key: 'easy', label: 'Easy (%)' },
                                { key: 'medium', label: 'Medium (%)' },
                                { key: 'hard', label: 'Hard (%)' },
                            ].map(({ key, label }) => (
                                <div key={key}>
                                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                        {label}
                                    </label>
                                    <select
                                        value={distribution[key]}
                                        onChange={(e) => handleDistributionChange(key, e.target.value)}
                                        className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-2 text-sm text-slate-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-colors"
                                    >
                                        {DISTRIBUTION_OPTIONS.map((opt) => (
                                            <option key={opt} value={opt}>{opt}%</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                    Count
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={count}
                                    onChange={(e) => setCount(Number(e.target.value || 1))}
                                    className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-2 text-sm text-slate-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Distribution validity ──────────────────────────── */}
                    <div className={isDistributionValid ? panelStyles.successBox : panelStyles.errorBox}>
                        Distribution Total: {distributionTotal}%{' '}
                        {isDistributionValid ? '(valid)' : '(must be 100%)'}
                    </div>

                    {/* ── Prompt preview box ─────────────────────────────── */}
                    <div className={panelStyles.mutedBox}>
                        <div className={components.host.aiPromptHeader}>
                            <div>
                                <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">
                                    Copy-ready prompt
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    Placeholders update from the fields above.
                                </p>
                            </div>
                            <button
                                onClick={handleCopyPrompt}
                                className={cx(
                                    'h-8 rounded-full px-3 text-[12px] font-semibold border transition-all duration-150',
                                    copiedPrompt
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 scale-95'
                                        : 'border-gray-200 text-slate-600 hover:bg-gray-100',
                                )}
                            >
                                {copiedPrompt ? <><Check size={12} className="inline mr-1" />Copied!</> : 'Copy Prompt'}
                            </button>
                        </div>
                        <pre className={cx(components.host.aiPromptCode, 'max-h-[120px] overflow-y-auto text-[11px]')}>
                            {promptText}
                        </pre>
                    </div>

                    {/* ── Status / results ───────────────────────────────── */}
                    {meta && (
                        <div className={panelStyles.infoBox}>
                            Generated mix {'→'} Easy: {meta.easy} | Medium: {meta.medium} | Hard: {meta.hard}
                        </div>
                    )}

                    {error && <div className={panelStyles.errorBox}>{error}</div>}

                    {loading && (
                        <div className="space-y-2">
                            <div className={panelStyles.loadingBox}>
                                <Loader2 size={14} className={components.host.spin} /> Generating questions…
                            </div>
                            {[1, 2, 3].map((n) => (
                                <div key={n} className={components.host.aiSkeleton} />
                            ))}
                        </div>
                    )}

                    {/* Tab switcher */}
                    {!loading && generated.length > 0 && (
                        <div className="flex gap-2">
                            {['preview', 'json'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={cx(
                                        'h-8 rounded-full px-4 text-[12px] font-bold uppercase tracking-wider transition-colors',
                                        activeTab === tab
                                            ? 'bg-indigo-600 text-white'
                                            : 'border border-gray-200 text-slate-500 hover:bg-gray-100',
                                    )}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    )}

                    {!loading && generated.length === 0 && (
                        <div className={panelStyles.mutedBox}>
                            Generated questions preview appears here.
                        </div>
                    )}

                    {/* Preview tab */}
                    {!loading && activeTab === 'preview' && generated.map((question, index) => (
                        <div key={`${question.text}-${index}`} className={cx('rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3')}>
                            <div className={components.host.aiQuestionHeader}>
                                <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                                    {index + 1}. {question.text}
                                </p>
                                <span className={components.host.aiQuestionDifficulty}>
                                    {question.difficulty || 'mixed'}
                                </span>
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
                                <p className="text-[12px] text-slate-500">
                                    <span className={components.host.aiExplainLabel}>Explanation:</span>{' '}
                                    {question.explanation}
                                </p>
                            )}
                        </div>
                    ))}

                    {/* JSON tab */}
                    {!loading && activeTab === 'json' && generated.length > 0 && (
                        <div className="space-y-2">
                            <button
                                onClick={handleCopyJSON}
                                className={cx(
                                    'h-8 rounded-full px-3 text-[12px] font-semibold border transition-all duration-150',
                                    copiedJson
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 scale-95'
                                        : 'border-gray-200 text-slate-600 hover:bg-gray-100',
                                )}
                            >
                                {copiedJson ? <><Check size={12} className="inline mr-1" />Copied JSON!</> : 'Copy JSON'}
                            </button>
                            <pre className={panelStyles.codePanel}>{JSON.stringify(generated, null, 2)}</pre>
                        </div>
                    )}
                </ModalBody>

                <ModalFooter>
                    <ModalButton
                        variant="secondary"
                        onClick={handleGenerate}
                        disabled={!generated.length || loading}
                    >
                        <RefreshCw size={13} /> Regenerate
                    </ModalButton>
                    <ModalButton
                        variant="primary"
                        onClick={handleGenerate}
                        disabled={!canGenerate || loading}
                    >
                        {loading ? <Loader2 size={13} className={components.host.spin} /> : <Sparkles size={13} />}
                        Generate
                    </ModalButton>
                    <ModalButton
                        variant="primary"
                        onClick={handleSave}
                        disabled={!generated.length || saving}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        {saving ? <Loader2 size={13} className={components.host.spin} /> : <Save size={13} />}
                        Save To Quiz
                    </ModalButton>
                </ModalFooter>
            </ModalShell>
        </Modal>
    );
};

export default AIGeneratorModal;
