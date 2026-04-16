import { cx } from '../../styles/theme';
import { motion } from 'framer-motion';

const OptionButton = ({ label, index, isSelected, isCorrect, onClick, disabled }) => {
    const letter = String.fromCharCode(65 + index); // A, B, C, D...

    return (
        <motion.button
            whileHover={!disabled && !isSelected ? { scale: 1.01 } : {}}
            whileTap={!disabled && !isSelected ? { scale: 0.98 } : {}}
            disabled={disabled}
            onClick={onClick}
            className={cx(
                "group relative w-full h-24 md:h-28 text-left rounded-[1.5rem] border-2 transition-all p-4 md:p-6 overflow-hidden",
                // Highlight states
                isCorrect === true ? "border-green-500 bg-green-500 text-white" :
                isCorrect === false ? "border-red-500 bg-red-500 text-white" :
                isSelected 
                    ? "border-slate-900 bg-slate-900 text-white shadow-[0_12px_24px_-8px_rgba(15,23,42,0.3)]" 
                    : "border-slate-200 bg-white hover:border-slate-900 hover:shadow-md",
                disabled && !isSelected && isCorrect === undefined ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
            )}
        >
            <div className="flex items-center gap-4 h-full">
                {/* Option Letter Icon */}
                <div className={cx(
                    "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-black text-lg transition-colors border-2",
                    isCorrect !== undefined || isSelected 
                        ? "bg-white/10 border-white/20 text-white" 
                        : "bg-slate-50 border-slate-100 text-slate-400 group-hover:bg-slate-900 group-hover:border-slate-800 group-hover:text-white"
                )}>
                    {isCorrect === true ? '✓' : isCorrect === false ? '✕' : letter}
                </div>

                {/* Option Content */}
                <span className={cx(
                    "flex-1 text-lg md:text-xl font-black tracking-tight",
                    (isCorrect !== undefined || isSelected) ? "text-white" : "theme-text-primary"
                )}>
                    {label}
                </span>

                {/* Status Indicator */}
                {(isSelected || isCorrect !== undefined) && (
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute top-4 right-4"
                    >
                        <div className={cx(
                            "w-2 h-2 rounded-full shadow-lg",
                            isCorrect === true ? "bg-white" : isCorrect === false ? "bg-white" : "bg-green-400 animate-pulse"
                        )} />
                    </motion.div>
                )}
            </div>
        </motion.button>
    );
};

export default OptionButton;
