import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, CheckCircle2, XCircle } from 'lucide-react';
import QuizTimerBar from './QuizTimerBar';
import OptionButton from '../../../components/common/OptionButton';
import { cards, typography, layout, cx } from '../../../styles/index';

const QuizQuestionCard = ({ currentQuestion, myResult, selectedOption, handleAnswer }) => {
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
                        {currentQuestion?.text}
                    </h2>
                </div>
            </motion.div>

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {(currentQuestion?.options || []).map((option, idx) => (
                    <OptionButton
                        key={idx}
                        label={option}
                        index={idx}
                        isSelected={selectedOption === option}
                        isCorrect={
                            myResult && selectedOption === option
                                ? myResult.isCorrect
                                : myResult && myResult.correctAnswer === option
                                    ? true
                                    : undefined
                        }
                        disabled={!!selectedOption}
                        onClick={() => handleAnswer(option)}
                    />
                ))}
            </div>
        </div>
    );
};

export default QuizQuestionCard;
