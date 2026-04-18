import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cx } from '../../../styles/theme';

const QuziMCQFeedback = ({ myResult, showFeedback }) => {
    if (!myResult || !showFeedback) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 50 }}
                className="fixed bottom-10 left-0 right-0 z-50 flex items-center justify-center pointer-events-none px-6"
            >
                <div className="surface-card shadow-2xl rounded-2xl p-4 flex items-center gap-4 border border-[var(--qb-border)] max-w-sm w-full mx-auto">
                    <div className={cx(
                        'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner',
                        myResult.isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    )}>
                        {myResult.isCorrect ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
                    </div>
                    <div className="flex-1">
                        <p className={cx("text-[17px] font-black tracking-tight leading-none", myResult.isCorrect ? "text-green-600" : "text-red-500")}>
                            {myResult.isCorrect ? 'Correct Answer!' : 'Incorrect Answer'}
                        </p>
                        <p className="text-[11px] font-bold theme-text-muted mt-1 uppercase tracking-widest leading-none">
                            {myResult.timeTaken ? `Answered in ${myResult.timeTaken.toFixed(1)}s` : 'Time expired'}
                        </p>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default QuziMCQFeedback;
