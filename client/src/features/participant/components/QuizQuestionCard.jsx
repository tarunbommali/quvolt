import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, CheckCircle2, XCircle } from 'lucide-react';
import OptionButton from '../../../components/common/OptionButton';
import { cards, typography, layout, cx } from '../../../styles/index';
import { resolveQuestionForLanguage } from '../../../utils/languageResolver';
import LanguagePill from '../../../components/i18n/LanguagePill';
import QuizTimerBar from './QuizTimerBar';

const QuizQuestionCard = ({ currentQuestion, myResult, selectedOption, handleAnswer, preferredLanguage, defaultLang }) => {
    if (!currentQuestion) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className={cx(cards.elevated, "!p-6")}>
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
                    <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
            </div>
        );
    }

    const resolved = resolveQuestionForLanguage(currentQuestion, preferredLanguage, defaultLang);

    return (
        <div className="space-y-4">
            <motion.div
                key={currentQuestion?._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={cx(cards.elevated, "overflow-hidden !p-0")}
            >
                {/* Timer bar */}
                <QuizTimerBar currentQuestion={currentQuestion} />

                <div className="p-6 space-y-4">
                    {/* Q label + result badge */}
                    <div className={layout.rowBetween}>
                        <div className={cx(layout.rowStart, "text-[var(--qb-primary)] gap-1.5")}>
                            <Zap size={14} fill="currentColor" />
                            <span className={typography.metaLabel}>Question {(currentQuestion?.index ?? 0) + 1}</span>
                            {preferredLanguage && <LanguagePill languageCode={preferredLanguage} />}
                        </div>

                        <AnimatePresence>
                            {myResult && (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className={cx(
                                        layout.rowStart,
                                        typography.micro,
                                        "px-2.5 py-1 rounded-md gap-1.5",
                                        myResult.isCorrect
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                                            : 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                                    )}
                                >
                                    {myResult.isCorrect
                                        ? <><CheckCircle2 size={12} /> +{myResult.score ?? 0}</>
                                        : <><XCircle size={12} /> -25</>
                                    }
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Question text */}
                    <h2 className={typography.h2}>
                        {resolved.question}
                    </h2>
                </div>
            </motion.div>

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {(resolved.options || []).map((optionText, idx) => {
                    const originalOptionText = currentQuestion?.options?.[idx] || optionText;
                    return (
                        <OptionButton
                            key={idx}
                            label={optionText}
                            index={idx}
                            isSelected={selectedOption === originalOptionText}
                            isCorrect={
                                myResult && selectedOption === originalOptionText
                                    ? myResult.isCorrect
                                    : myResult && myResult.correctAnswer === originalOptionText
                                        ? true
                                        : undefined
                            }
                            disabled={!!selectedOption}
                            onClick={() => handleAnswer(originalOptionText)}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default QuizQuestionCard;
