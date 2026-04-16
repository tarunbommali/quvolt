import { useState } from 'react';
import { Zap, CalendarClock, Play } from 'lucide-react';
import SubHeader from '../layout/SubHeader';
import { buttonStyles } from '../../styles/buttonStyles';

const getQuizStatus = (quiz) => String(quiz?.status || '').toLowerCase();

/**
 * LaunchChooser - shown when a quiz has never been started.
 * Lets the organizer choose between:
 *   - Go Live Now -> instant session with a stable live code until it ends
 *   - Schedule    -> permanent link/QR, future date-time
 */
const LaunchChooser = ({ activeQuiz, navigate, onGoLiveNow, onSchedule, showToast }) => {
    const [mode, setMode] = useState('instant');
    const [scheduledAt, setScheduledAt] = useState('');
    const [submittingAction, setSubmittingAction] = useState('');
    const status = getQuizStatus(activeQuiz);
    const primaryLabel = status === 'live'
        ? 'Join Now'
        : status === 'waiting'
            ? 'Join Now'
            : 'Join Now';
    const instantDescription = status === 'live'
        ? 'Your quiz is already live. Join the live room.'
        : status === 'waiting'
            ? 'A waiting room already exists. Join the live room.'
            : 'Start immediately and join the live room';

    const minDatetime = new Date(Date.now() + 5 * 60 * 1000)
        .toISOString()
        .slice(0, 16);

    const handleSchedule = async () => {
        if (!scheduledAt) {
            showToast('Pick a date & time');
            return;
        }
        setSubmittingAction('schedule');
        try {
            await onSchedule(scheduledAt);
        } finally {
            setSubmittingAction('');
        }
    };

    const handleGoLive = async () => {
        setSubmittingAction('instant');
        try {
            await onGoLiveNow();
        } finally {
            setSubmittingAction('');
        }
    };

    const rowBase = 'flex cursor-pointer items-center justify-between gap-4 rounded-xl border theme-border theme-surface px-5 py-4 transition-colors theme-interactive hover:theme-surface-soft';
    const selectedRow = 'border-[color-mix(in_srgb,var(--qb-primary)_45%,var(--qb-border))] bg-[color-mix(in_srgb,var(--qb-primary)_14%,var(--qb-surface-1))]';
    const idleRow = '';

    return (
        <div className="app-page mx-auto  space-y-6 animate-in fade-in duration-300">
            <SubHeader
                title="Launch Session"
                subtitle="Choose how you want to run this quiz"
                breadcrumbs={[
                    { label: 'Studio', href: '/studio' },
                    { label: activeQuiz.title },
                    { label: 'Launch Session' },
                ]}
            />

            <section className="space-y-4">
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setMode('instant')}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setMode('instant');
                        }
                    }}
                    className={`${rowBase} ${mode === 'instant' ? selectedRow : idleRow}`}
                >
                    <div className="flex items-center gap-3">
                        <span className="rounded-lg bg-[color-mix(in_srgb,var(--qb-primary)_14%,var(--qb-surface-1))] p-2 text-(--qb-primary)">
                            <Zap size={16} className="fill-(--qb-primary)" />
                        </span>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-semibold theme-text-primary">Instant Live</h2>
                                <span className="rounded-full bg-[color-mix(in_srgb,var(--qb-primary)_16%,var(--qb-surface-1))] px-2 py-0.5 text-[10px] font-bold text-(--qb-primary)">Recommended</span>
                            </div>
                            <p className="text-sm theme-text-secondary">{instantDescription}</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            handleGoLive();
                        }}
                        disabled={submittingAction !== ''}
                        className={`${buttonStyles.primary} w-full rounded-lg px-3 py-1.5 text-sm font-semibold md:w-auto disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                        {submittingAction === 'instant' ? 'Launching...' : primaryLabel}
                    </button>
                </div>

                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setMode('schedule')}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setMode('schedule');
                        }
                    }}
                    className={`${rowBase} ${mode === 'schedule' ? selectedRow : idleRow}`}
                >
                    <div className="flex items-center gap-3">
                        <span className="rounded-lg bg-[color-mix(in_srgb,var(--qb-accent)_14%,var(--qb-surface-1))] p-2 text-(--qb-accent)">
                            <CalendarClock size={16} />
                        </span>
                        <div className="space-y-1">
                            <h2 className="text-sm font-semibold theme-text-primary">Schedule Session</h2>
                            <p className="text-sm theme-text-secondary">Pick a future date and time</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            if (mode !== 'schedule') {
                                setMode('schedule');
                                return;
                            }
                            handleSchedule();
                        }}
                        disabled={submittingAction !== ''}
                        className={`${buttonStyles.secondary} w-full rounded-lg px-3 py-1.5 text-sm font-semibold md:w-auto disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                        {submittingAction === 'schedule' ? 'Scheduling...' : mode === 'schedule' ? 'Confirm schedule' : 'Schedule'}
                    </button>
                </div>

                {mode === 'schedule' && (
                    <div className="rounded-xl border theme-border theme-surface px-5 py-4">
                        <label className="mb-2 block text-xs font-bold theme-text-muted">
                            Session date and time
                        </label>
                        <input
                            type="datetime-local"
                            min={minDatetime}
                            value={scheduledAt}
                            onChange={(event) => setScheduledAt(event.target.value)}
                            className="w-full rounded-xl border theme-border theme-surface-soft px-3 py-2 text-sm theme-text-primary focus:outline-none focus:ring-2 focus:ring-(--qb-primary)"
                        />
                    </div>
                )}
            </section>
        </div>
    );
};

export default LaunchChooser;
