import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, CheckCircle2, XCircle, Clock, Target, TrendingUp, 
    BarChart3, Zap, HelpCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import apiClient from '../../../services/apiClient';
import LoadingScreen from '../../../components/common/LoadingScreen';
import PageHeader from '../../../components/layout/PageHeader';
import { cards, typography, buttonStyles, layout, cx } from '../../../styles/index';

const QuizAnalysisPage = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedQ, setExpandedQ] = useState(null);
    const [filter, setFilter] = useState('all'); // all | correct | wrong | skipped

    useEffect(() => {
        const fetchAnalysis = async () => {
            try {
                const res = await apiClient.get(`/submissions/my-results/${sessionId}`);
                if (res.data?.success) {
                    setData(res.data.data);
                } else {
                    setError(res.data?.message || 'Failed to load analysis');
                }
            } catch (err) {
                setError(err?.response?.data?.message || 'Failed to load analysis');
            } finally {
                setLoading(false);
            }
        };
        fetchAnalysis();
    }, [sessionId]);

    if (loading) return <LoadingScreen />;
    if (error) {
        return (
            <div className="max-w-3xl mx-auto px-6 py-20 text-center space-y-4">
                <XCircle size={48} className="mx-auto text-red-500" />
                <h2 className={typography.h2}>Analysis Unavailable</h2>
                <p className={typography.body}>{error}</p>
                <button onClick={() => navigate(-1)} className={cx(buttonStyles.base, buttonStyles.secondary, "mx-auto")}>
                    <ArrowLeft size={16} /> Go Back
                </button>
            </div>
        );
    }

    const { summary, questions, quizTitle } = data;

    const filteredQuestions = questions.filter(q => {
        if (filter === 'correct') return q.isCorrect && !q.skipped;
        if (filter === 'wrong') return !q.isCorrect && !q.skipped;
        if (filter === 'skipped') return q.skipped;
        return true;
    });

    const accuracyColor = summary.accuracy >= 80
        ? 'text-emerald-600 dark:text-emerald-400'
        : summary.accuracy >= 50
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-red-600 dark:text-red-400';

    const accuracyBg = summary.accuracy >= 80
        ? 'from-emerald-500/10 to-emerald-500/5'
        : summary.accuracy >= 50
            ? 'from-amber-500/10 to-amber-500/5'
            : 'from-red-500/10 to-red-500/5';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-4xl mx-auto px-6 py-8 space-y-8"
        >
            <PageHeader breadcrumbs={[
                { label: 'History', path: '/p/history' },
                { label: quizTitle },
            ]} />

            {/* ── Score Card ─────────────────────────────────────────────── */}
            <div className={cx(cards.elevated, `!p-0 overflow-hidden bg-gradient-to-br ${accuracyBg}`)}>
                <div className="p-8 space-y-6">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <h1 className={cx(typography.h1, "!text-2xl")}>{quizTitle}</h1>
                            <p className={typography.micro}>Quiz Analysis · {summary.totalQuestions} Questions</p>
                        </div>
                        <div className={cx(
                            "text-4xl font-black tabular-nums leading-none",
                            accuracyColor
                        )}>
                            {summary.accuracy}%
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <StatBox
                            icon={<CheckCircle2 size={18} />}
                            label="Correct"
                            value={summary.totalCorrect}
                            color="text-emerald-600 dark:text-emerald-400"
                            bg="bg-emerald-500/10"
                        />
                        <StatBox
                            icon={<XCircle size={18} />}
                            label="Wrong"
                            value={summary.totalWrong}
                            color="text-red-600 dark:text-red-400"
                            bg="bg-red-500/10"
                        />
                        <StatBox
                            icon={<HelpCircle size={18} />}
                            label="Skipped"
                            value={summary.totalSkipped}
                            color="text-gray-500"
                            bg="bg-gray-500/10"
                        />
                        <StatBox
                            icon={<TrendingUp size={18} />}
                            label="Score"
                            value={summary.totalScore}
                            color="text-[var(--qb-primary)]"
                            bg="bg-[var(--qb-primary)]/10"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className={cx(cards.flat, "flex items-center gap-3")}>
                            <Clock size={16} className="theme-text-muted" />
                            <div>
                                <p className={typography.micro}>Avg. Time / Q</p>
                                <p className={cx(typography.bodyStrong, "tabular-nums")}>{summary.avgTimePerQuestion}s</p>
                            </div>
                        </div>
                        <div className={cx(cards.flat, "flex items-center gap-3")}>
                            <Zap size={16} className="text-amber-500" />
                            <div>
                                <p className={typography.micro}>Total Time</p>
                                <p className={cx(typography.bodyStrong, "tabular-nums")}>{summary.totalTimeTaken}s</p>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden flex">
                            <div
                                className="bg-emerald-500 h-full transition-all duration-700 rounded-l-full"
                                style={{ width: `${(summary.totalCorrect / summary.totalQuestions) * 100}%` }}
                            />
                            <div
                                className="bg-red-500 h-full transition-all duration-700"
                                style={{ width: `${(summary.totalWrong / summary.totalQuestions) * 100}%` }}
                            />
                            <div
                                className="bg-gray-400 h-full transition-all duration-700 rounded-r-full"
                                style={{ width: `${(summary.totalSkipped / summary.totalQuestions) * 100}%` }}
                            />
                        </div>
                        <div className="flex gap-4 text-xs theme-text-muted">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Correct</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Wrong</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" /> Skipped</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Filter Tabs ────────────────────────────────────────────── */}
            <div className="flex gap-2 flex-wrap">
                {[
                    { key: 'all', label: `All (${questions.length})` },
                    { key: 'correct', label: `Correct (${summary.totalCorrect})`, icon: <CheckCircle2 size={14} /> },
                    { key: 'wrong', label: `Wrong (${summary.totalWrong})`, icon: <XCircle size={14} /> },
                    { key: 'skipped', label: `Skipped (${summary.totalSkipped})`, icon: <HelpCircle size={14} /> },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={cx(
                            "px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-all border",
                            filter === tab.key
                                ? "bg-[var(--qb-primary)] text-white border-transparent shadow-sm"
                                : "border-transparent theme-surface-soft theme-text-muted hover:border-[var(--qb-primary)]/30"
                        )}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Question Analysis Cards ─────────────────────────────────── */}
            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {filteredQuestions.map((q, i) => (
                        <QuestionAnalysisCard
                            key={q.questionId || i}
                            question={q}
                            isExpanded={expandedQ === i}
                            onToggle={() => setExpandedQ(expandedQ === i ? null : i)}
                        />
                    ))}
                </AnimatePresence>

                {filteredQuestions.length === 0 && (
                    <div className={cx(cards.default, "text-center py-12")}>
                        <p className={typography.body}>No questions match this filter.</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

// ── Sub-Components ──────────────────────────────────────────────────────────

const StatBox = ({ icon, label, value, color, bg }) => (
    <div className={cx("rounded-2xl p-4 space-y-1", bg)}>
        <div className={cx("flex items-center gap-1.5", color)}>
            {icon}
            <span className={cx(typography.micro, "!tracking-normal")}>{label}</span>
        </div>
        <p className={cx("text-2xl font-black tabular-nums", color)}>{value}</p>
    </div>
);

const QuestionAnalysisCard = ({ question, isExpanded, onToggle }) => {
    const q = question;
    const statusColor = q.skipped
        ? 'border-l-gray-400'
        : q.isCorrect
            ? 'border-l-emerald-500'
            : 'border-l-red-500';

    const statusBadge = q.skipped
        ? { text: 'Skipped', bg: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' }
        : q.isCorrect
            ? { text: 'Correct', bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' }
            : { text: 'Wrong', bg: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={cx(cards.default, `!p-0 border-l-4 ${statusColor} overflow-hidden`)}
        >
            {/* Header — always visible */}
            <button
                onClick={onToggle}
                className="w-full p-5 flex items-start justify-between gap-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
                <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={cx(typography.micro, "!text-[var(--qb-primary)]")}>Q{(q.questionIndex ?? 0) + 1}</span>
                        <span className={cx("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase", statusBadge.bg)}>
                            {statusBadge.text}
                        </span>
                        {!q.skipped && (
                            <span className={cx(typography.micro, "flex items-center gap-1")}>
                                <Clock size={10} /> {Number(q.timeTaken).toFixed(1)}s
                            </span>
                        )}
                        {q.score > 0 && (
                            <span className="text-[10px] font-bold text-[var(--qb-primary)]">+{q.score}</span>
                        )}
                    </div>
                    <p className={cx(typography.bodyStrong, "leading-snug")}>{q.questionText}</p>
                </div>
                <div className="shrink-0 pt-1 theme-text-muted">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
            </button>

            {/* Expanded: show options */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 space-y-2 border-t theme-border pt-4">
                            {(q.options || []).map((opt, idx) => {
                                const isCorrectOption = idx === q.correctOption;
                                const isSelected = opt === q.selectedOption;

                                let optionStyle = 'theme-surface border theme-border';
                                if (isCorrectOption) {
                                    optionStyle = 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300';
                                } else if (isSelected && !q.isCorrect) {
                                    optionStyle = 'bg-red-50 border-red-300 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300';
                                }

                                return (
                                    <div
                                        key={idx}
                                        className={cx(
                                            "px-4 py-3 rounded-xl border text-sm flex items-center gap-3",
                                            optionStyle
                                        )}
                                    >
                                        <span className="w-6 h-6 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0" style={{
                                            borderColor: isCorrectOption ? '#10b981' : isSelected && !q.isCorrect ? '#ef4444' : 'var(--qb-border)',
                                            background: isCorrectOption ? '#d1fae5' : isSelected && !q.isCorrect ? '#fee2e2' : 'transparent',
                                            color: isCorrectOption ? '#065f46' : isSelected && !q.isCorrect ? '#991b1b' : 'inherit'
                                        }}>
                                            {String.fromCharCode(65 + idx)}
                                        </span>
                                        <span className="flex-1">{opt}</span>
                                        {isCorrectOption && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}
                                        {isSelected && !q.isCorrect && !isCorrectOption && <XCircle size={16} className="text-red-500 shrink-0" />}
                                        {isSelected && <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Your Answer</span>}
                                    </div>
                                );
                            })}

                            {q.explanation && (
                                <div className="mt-3 p-4 rounded-xl bg-[var(--qb-primary)]/5 border border-[var(--qb-primary)]/15 text-sm theme-text-primary">
                                    <p className={cx(typography.micro, "!text-[var(--qb-primary)] mb-1")}>Explanation</p>
                                    {q.explanation}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default QuizAnalysisPage;
