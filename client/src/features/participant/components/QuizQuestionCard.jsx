import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, CheckCircle2, XCircle } from 'lucide-react';
import QuizTimerBar from './QuizTimerBar';
import OptionButton from '../../../components/common/OptionButton';
import { cx } from '../../../styles/theme';

const QuizQuestionCard = ({ currentQuestion, myResult, selectedOption, handleAnswer }) => {
    return (
        <div className="space-y-5">
            <motion.div
                key={currentQuestion?._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="surface-card rounded-2xl overflow-hidden shadow-sm border theme-border"
            >
                {/* Timer bar */}
                <QuizTimerBar currentQuestion={currentQuestion} />

                <div className="p-6 space-y-4">
                    {/* Q label + result badge */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[var(--qb-primary)] text-xs font-black uppercase tracking-widest">
                            <Zap size={13} fill="currentColor" />
                            <span>Question {(currentQuestion?.index ?? 0) + 1}</span>
                        </div>

                        <AnimatePresence>
                            {myResult && (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className={cx(
                                        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider',
                                        myResult.isCorrect
                                            ? 'bg-green-50 text-green-700 border border-green-200'
                                            : 'bg-red-50 text-red-600 border border-red-200'
                                    )}
                                >
                                    {myResult.isCorrect
                                        ? <><CheckCircle2 size={11} /> +{myResult.score ?? 0}</>
                                        : <><XCircle size={11} /> -25</>
                                    }
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Question text */}
                    <h2 className="text-xl md:text-2xl font-black theme-text-primary leading-snug">
                        {currentQuestion?.text}
                    </h2>
                </div>
            </motion.div>

            {/* Options */}
            <div className="relative mt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
        </div>
    );
};

export default QuizQuestionCard;

