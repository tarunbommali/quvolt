import React from 'react';
import { BarChart2, ArrowRight, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * EmptyAnalyticsState
 * Shown when:
 *   - The host has no sessions yet (first-time user)
 *   - The sessions list loaded but is empty
 *
 * Props:
 *   title   {string}  override the headline
 *   message {string}  override the body copy
 *   showCTA {boolean} show "Run a Quiz" button (default true)
 */
const EmptyAnalyticsState = ({
    title   = 'No sessions yet',
    message = 'Run your first quiz to start seeing real-time analytics across all your sessions.',
    showCTA = true,
}) => {
    const navigate = useNavigate();
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-6 max-w-sm mx-auto">
            <div className="w-20 h-20 rounded-3xl bg-[var(--qb-primary)]/10 flex items-center justify-center">
                <BarChart2 size={40} className="text-[var(--qb-primary)]" strokeWidth={1.5} />
            </div>
            <div className="space-y-2">
                <h3 className="text-base font-bold theme-text-primary">{title}</h3>
                <p className="text-sm theme-text-muted leading-relaxed">{message}</p>
            </div>
            {showCTA && (
                <button
                    type="button"
                    onClick={() => navigate('/studio')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--qb-primary)] text-white text-sm font-bold hover:opacity-90 transition-opacity"
                >
                    Go to Studio
                    <ArrowRight size={16} />
                </button>
            )}
        </div>
    );
};

/**
 * AnalyticsErrorState
 * Shown when the API returns an error.
 *
 * Props:
 *   message  {string}
 *   onRetry  {function}
 */
export const AnalyticsErrorState = ({ 
    message = 'Something went wrong.', 
    title = 'Failed to load analytics',
    icon: Icon = AlertCircle,
    onRetry,
    retryLabel = 'Try Again'
}) => (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-6 max-w-sm mx-auto">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center">
            <Icon size={40} className="text-red-400" strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
            <h3 className="text-base font-bold theme-text-primary">{title}</h3>
            <p className="text-sm theme-text-muted leading-relaxed">{message}</p>
        </div>
        {onRetry && (
            <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border theme-border theme-text-secondary text-sm font-bold hover:bg-[var(--qb-surface-soft)] theme-text-primary transition-colors"
            >
                {retryLabel}
            </button>
        )}
    </div>
);

export default EmptyAnalyticsState;
