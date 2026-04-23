import React from 'react';
import { motion as Motion } from 'framer-motion';
import { History } from 'lucide-react';
import { textStyles } from '../../../styles/index';

const HistoryEmptyState = () => (
    <Motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-24 text-center rounded-[3rem] border-2 border-dashed theme-border bg-gray-50/50 dark:bg-white/5"
    >
        <div className="w-20 h-20 rounded-3xl bg-white dark:bg-white/10 flex items-center justify-center shadow-sm mb-6 text-indigo-500">
            <History size={40} />
        </div>
        <h3 className={textStyles.value2Xl + " !font-black !text-2xl"}>No history yet</h3>
        <p className={textStyles.subtitle + " max-w-xs mt-2"}>
            Completed sessions and performance reports will appear here once you finish your first quiz.
        </p>
    </Motion.div>
);

export default HistoryEmptyState;

