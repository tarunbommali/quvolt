import React from 'react';
import { motion } from 'framer-motion';

const QuizTimerBar = ({ currentQuestion }) => {
    return (
        <div className="h-1 theme-surface-soft">
            <motion.div
                key={currentQuestion?._id + '-bar'}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: currentQuestion?.timeLimit || 30, ease: 'linear' }}
                className="h-full bg-[var(--qb-primary)]"
            />
        </div>
    );
};

export default QuizTimerBar;

