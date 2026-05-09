import React from 'react';
import { BarChart2, AlertCircle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cards, typography, buttonStyles, cx } from '../../../styles'

export const EmptyAnalyticsState = ({
    title = 'Intelligence Offline',
    message = 'Run your first session to synchronize real-time cognitive analytics across your audience.',
    showCTA = true,
}) => {
    const navigate = useNavigate();
    return (
        <div className={cx(cards.empty, "py-20 text-center gap-6 max-w-2xl mx-auto")}>
            <div className="relative">
                <div className="absolute -inset-4 bg-[var(--qb-primary)]/10 blur-xl rounded-full animate-pulse" />
                <div className="relative w-20 h-20 rounded-2xl bg-[var(--qb-primary)]/10 flex items-center justify-center text-[var(--qb-primary)] shadow-sm">
                    <BarChart2 size={40} />
                </div>
            </div>
            <div className="space-y-2">
                <h3 className={typography.h2}>{title}</h3>
                <p className={typography.body}>{message}</p>
            </div>
            {showCTA && (
                <button
                    type="button"
                    onClick={() => navigate('/workspace')}
                    className={cx(buttonStyles.base, buttonStyles.primary, buttonStyles.sizeLg, "gap-2 mt-4")}
                >
                    <Sparkles size={16} /> Establish First Session
                </button>
            )}
        </div>
    );
};

export const AnalyticsErrorState = ({
    message = 'The analytical pipeline encountered an unhandled exception.',
    title = 'Pipeline Failure',
    icon: Icon = AlertCircle,
    onRetry,
    retryLabel = 'Re-Initialize'
}) => (
    <div className={cx(cards.empty, "py-20 text-center gap-6 max-w-2xl mx-auto !border-red-200 dark:!border-red-900/30 !bg-red-50/50 dark:!bg-red-900/10")}>
        <div className="w-20 h-20 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-500 shadow-sm">
            <Icon size={40} />
        </div>
        <div className="space-y-2">
            <h3 className={typography.h2}>{title}</h3>
            <p className={typography.body}>{message}</p>
        </div>
        {onRetry && (
            <button
                type="button"
                onClick={onRetry}
                className={cx(buttonStyles.base, buttonStyles.secondary, buttonStyles.sizeMd, "text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20 dark:hover:border-red-700 mt-4")}
            >
                {retryLabel}
            </button>
        )}
    </div>
);

export default EmptyAnalyticsState;
