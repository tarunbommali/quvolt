import { cx } from '../../styles/theme';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';

// Option color palettes — maps to the 4 quiz option slots
const OPTION_PALETTES = [
    { idle: 'bg-indigo-50 border-indigo-100 text-indigo-700', label: 'bg-indigo-100 text-indigo-700' },
    { idle: 'bg-violet-50 border-violet-100 text-violet-700', label: 'bg-violet-100 text-violet-700' },
    { idle: 'bg-sky-50 border-sky-100 text-sky-700', label: 'bg-sky-100 text-sky-700' },
    { idle: 'bg-amber-50 border-amber-100 text-amber-700', label: 'bg-amber-100 text-amber-700' },
];

const OptionButton = ({ label, index, isSelected, isCorrect, onClick, disabled }) => {
    const letter = String.fromCharCode(65 + index); // A, B, C, D
    const palette = OPTION_PALETTES[index % OPTION_PALETTES.length];

    // Determine visual state
    const isRevealed = isCorrect !== undefined;
    const isWrong = isRevealed && isCorrect === false && isSelected;
    const isRight = isRevealed && isCorrect === true;

    const cardClass = cx(
        'group relative w-full text-left rounded-2xl border transition-all duration-200 p-4 overflow-hidden',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--qb-primary)]',
        isRight
            ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
            : isWrong
            ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
            : isSelected
            ? 'border-[var(--qb-primary)] bg-[color-mix(in_srgb,var(--qb-primary)_8%,var(--qb-surface-1))]'
            : 'border-[var(--qb-border)] theme-surface hover:border-[var(--qb-primary)] hover:bg-[color-mix(in_srgb,var(--qb-primary)_5%,var(--qb-surface-1))]',
        disabled && !isSelected && !isRevealed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
    );

    const letterBadgeClass = cx(
        'w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-xs font-black border transition-colors',
        isRight
            ? 'bg-green-100 border-green-200 text-green-700 dark:bg-green-800/40 dark:text-green-300'
            : isWrong
            ? 'bg-red-100 border-red-200 text-red-700 dark:bg-red-800/40 dark:text-red-300'
            : isSelected
            ? 'bg-[var(--qb-primary)] border-[var(--qb-primary)] text-white'
            : `${palette.idle} group-hover:bg-[var(--qb-primary)] group-hover:border-[var(--qb-primary)] group-hover:text-white`
    );

    const labelClass = cx(
        'flex-1 text-sm md:text-base font-semibold leading-snug',
        isRight
            ? 'text-green-800 dark:text-green-200'
            : isWrong
            ? 'text-red-800 dark:text-red-200'
            : isSelected
            ? 'text-[var(--qb-primary)]'
            : 'theme-text-primary'
    );

    return (
        <motion.button
            whileHover={!disabled && !isSelected ? { y: -1 } : {}}
            whileTap={!disabled && !isSelected ? { scale: 0.99 } : {}}
            disabled={disabled}
            onClick={onClick}
            className={cardClass}
        >
            <div className="flex items-center gap-3 h-full min-h-[3rem]">
                {/* Letter badge */}
                <div className={letterBadgeClass}>
                    {isRight ? <CheckCircle2 size={16} /> : isWrong ? <XCircle size={16} /> : letter}
                </div>

                {/* Label */}
                <span className={labelClass}>{label}</span>

                {/* Selected pulse dot */}
                {isSelected && !isRevealed && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-2 h-2 rounded-full bg-[var(--qb-primary)] animate-pulse shrink-0"
                    />
                )}
            </div>
        </motion.button>
    );
};

export default OptionButton;
