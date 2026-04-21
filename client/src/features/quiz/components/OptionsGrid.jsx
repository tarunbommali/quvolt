import { memo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const OptionsGrid = ({ options, selectedOption, timeLeft, onSubmitAnswer, myResult }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="wait">
                {options.map((option, i) => {
                    const isSelected = selectedOption === option;
                    const isSubmitting = isSelected && !myResult;

                    return (
                        <button
                            key={`${option}-${i}`}
                            aria-label={`Select option ${option}`}
                            aria-pressed={isSelected}
                            onClick={() => onSubmitAnswer(option)}
                            disabled={!!selectedOption || timeLeft === 0}
                            className={`qr-option-btn
                                ${
                                    isSelected
                                        ? 'border-(--qb-primary) bg-[color-mix(in_srgb,var(--qb-primary)_14%,var(--qb-surface-1))] ring-2 ring-[color-mix(in_srgb,var(--qb-primary)_30%,white)] scale-[0.98]'
                                        : 'border-[color-mix(in_srgb,var(--qb-primary)_28%,var(--qb-border))] bg-[color-mix(in_srgb,var(--qb-primary)_10%,var(--qb-surface-1))] hover:bg-[color-mix(in_srgb,var(--qb-primary)_16%,var(--qb-surface-1))] hover:border-(--qb-primary)'
                                }
                                ${selectedOption && !isSelected ? 'opacity-45 saturate-50' : 'opacity-100'}
                            `}
                        >
                            <div
                                className={`absolute top-4 left-6 px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1 ${
                                    isSelected ? 'bg-(--qb-text-1) text-white' : 'bg-(--qb-primary) text-white'
                                }`}
                            >
                                OPTION {String.fromCharCode(65 + i)}
                            </div>

                            <span className="w-full wrap-break-word theme-text-primary mt-2 text-lg font-semibold">
                                {option}
                            </span>

                            {isSubmitting && (
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                    <span className="absolute h-8 w-8 rounded-full bg-[color-mix(in_srgb,var(--qb-primary)_18%,transparent)] animate-ping" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

export default memo(OptionsGrid);

