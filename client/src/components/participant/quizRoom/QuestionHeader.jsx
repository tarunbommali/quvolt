const QuestionHeader = ({ currentQuestion, timeLeft }) => {
    return (
        <div
            className="qr-card flex items-center justify-between relative overflow-hidden p-8"
            style={{ minHeight: '140px' }}
            aria-live="polite"
        >
            <div
                className="absolute top-0 left-0 h-1 bg-(--qb-primary) transition-all duration-1000"
                style={{ width: `${(timeLeft / currentQuestion?.timeLimit) * 100}%` }}
            />
            <div className="space-y-2 relative z-10">
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-[color-mix(in_srgb,var(--qb-primary)_14%,var(--qb-surface-1))] text-(--qb-primary) text-[11px] font-medium rounded-full uppercase tracking-wide">
                        Q{currentQuestion?.index + 1} / {currentQuestion?.total}
                    </span>
                    <span className="theme-text-muted font-medium text-xs uppercase tracking-wide">
                        {currentQuestion?.questionType?.replace('-', ' ')}
                    </span>
                </div>
                <h2 className="qr-heading mt-2 leading-tight">
                    {currentQuestion?.text}
                </h2>
            </div>
            <div
                className="relative z-10 flex shrink-0 flex-col items-center rounded-2xl border theme-border theme-surface-soft px-6 py-4"
                style={{ minWidth: '100px' }}
                aria-label={`Time remaining: ${timeLeft} seconds`}
            >
                <span className="text-[11px] font-medium theme-text-muted uppercase tracking-wide mb-1">Time limit</span>
                <span className={`text-3xl font-medium ${
                    timeLeft < 10 ? 'text-red-500 animate-pulse' : 'theme-text-primary'
                }`}>
                    {timeLeft}
                </span>
            </div>
        </div>
    );
};

export default QuestionHeader;
