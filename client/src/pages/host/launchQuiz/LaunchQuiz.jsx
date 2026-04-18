import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Zap, CalendarClock } from 'lucide-react';
import { scheduleQuiz, startQuizSession as apiStartQuizSession } from '../../../services/api';
import Toast from '../../../components/common/Toast';
import useToast from '../../../hooks/useToast';
import LoadingScreen from '../../../components/common/LoadingScreen';
import SubHeader from '../../../components/layout/SubHeader';
import { useQuizStore } from '../../../stores/useQuizStore';
import { resolveSessionRoute } from '../../../utils/sessionRouteResolver';
import { buttonStyles } from '../../../styles/buttonStyles';

const getQuizStatus = (quiz) => String(quiz?.status || '').toLowerCase();

/**
 * LaunchQuiz - shown when a quiz has never been started.
 * Lets the host choose between:
 *   - Go Live Now -> instant session with a stable live code until it ends
 *   - Schedule    -> permanent link/QR, future date-time
 */
const LaunchQuiz = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const getQuizzesForParent = useQuizStore((state) => state.getQuizzesForParent);
    const activeQuiz = useQuizStore((state) => state.activeQuiz);
    const setActiveQuiz = useQuizStore((state) => state.setActiveQuiz);
    const setSessionCode = useQuizStore((state) => state.setSessionCode);
    const setStatus = useQuizStore((state) => state.setStatus);
    const resetRealtimeState = useQuizStore((state) => state.resetRealtimeState);

    const { toast, showToast, clearToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState('instant');
    const [scheduledAt, setScheduledAt] = useState('');
    const [submittingAction, setSubmittingAction] = useState('');

    useEffect(() => {
        resetRealtimeState();
    }, [resetRealtimeState]);

    useEffect(() => {
        if (location.state?.quiz) {
            setActiveQuiz(location.state.quiz);
        }
    }, [location.state?.quiz, setActiveQuiz]);

    useEffect(() => {
        let active = true;

        const initLaunch = async () => {
            try {
                let quiz = activeQuiz;

                if (!quiz || String(quiz._id) !== String(id)) {
                    let quizzes = await getQuizzesForParent('none');
                    quiz = quizzes.find((item) => String(item._id) === String(id));

                    if (!quiz) {
                        quizzes = await getQuizzesForParent('none', { force: true });
                        quiz = quizzes.find((item) => String(item._id) === String(id));
                    }

                    if (!quiz) throw new Error('Quiz not found');
                    if (!active) return;
                    setActiveQuiz(quiz);
                }

                if (!active) return;

                if (String(quiz?.status || '').toLowerCase() === 'waiting') {
                    navigate(`/invite/${quiz._id}`, { replace: true, state: { quiz, forceLaunch: true } });
                    return;
                }

                setLoading(false);
            } catch {
                if (!active) return;
                showToast('Failed to load launch page');
                navigate('/studio');
            }
        };

        initLaunch();

        return () => {
            active = false;
        };
    }, [activeQuiz, getQuizzesForParent, id, location.pathname, navigate, setActiveQuiz, showToast]);

    const handleGoLiveNow = async () => {
        if (!activeQuiz) return;
        setSubmittingAction('instant');

        const status = getQuizStatus(activeQuiz);

        if (status === 'live') {
            setSubmittingAction('');
            navigate(`/live/${activeQuiz._id}`, { replace: true, state: { quiz: activeQuiz, forceLaunch: true } });
            return;
        }

        if (status === 'waiting' || status === 'scheduled') {
            setSubmittingAction('');
            const nextQuiz = { ...activeQuiz, _id: activeQuiz._id, status, sessionCode: activeQuiz.sessionCode || activeQuiz.activeSessionCode || activeQuiz.roomCode };
            navigate(resolveSessionRoute(nextQuiz), { replace: true, state: { quiz: nextQuiz, forceLaunch: true } });
            return;
        }

        try {
            const freshQuiz = await apiStartQuizSession(activeQuiz._id);
            const liveCode = freshQuiz.sessionCode || freshQuiz.roomCode;
            const nextQuiz = {
                ...activeQuiz,
                ...freshQuiz,
                _id: freshQuiz._id || activeQuiz._id,
                status: freshQuiz.status || 'waiting',
                sessionCode: liveCode,
            };
            if (!nextQuiz._id || !nextQuiz.status) {
                throw new Error('Session payload incomplete');
            }
            setSessionCode(liveCode);
            setActiveQuiz(nextQuiz);
            setStatus(nextQuiz.status);
            navigate(resolveSessionRoute(nextQuiz), { replace: true, state: { quiz: nextQuiz, forceLaunch: true } });
        } catch (error) {
            showToast(error?.response?.data?.message || error?.message || 'Failed to start session');
        } finally {
            setSubmittingAction('');
        }
    };

    const handleSchedule = async () => {
        if (!activeQuiz) return;
        if (!scheduledAt) {
            showToast('Pick a date & time');
            return;
        }

        setSubmittingAction('schedule');
        try {
            const updated = await scheduleQuiz(activeQuiz._id, scheduledAt);
            const nextQuiz = { ...updated, status: updated.status || 'scheduled' };
            setActiveQuiz(nextQuiz);
            setStatus('scheduled');
            navigate(resolveSessionRoute(nextQuiz), { replace: true, state: { quiz: nextQuiz } });
            showToast('Quiz scheduled! Permanent link is ready.', 'success');
        } catch (error) {
            showToast(error?.response?.data?.message || 'Failed to schedule quiz');
        } finally {
            setSubmittingAction('');
        }
    };

    if (loading || !activeQuiz) return <LoadingScreen />;

    const status = getQuizStatus(activeQuiz);
    const primaryLabel = (status === 'live' || status === 'waiting') ? 'Join Now' : 'Go Live Now';
    const instantDescription = status === 'live'
        ? 'Your quiz is already live. Join the room.'
        : status === 'waiting'
            ? 'A waiting room already exists. Join now.'
            : 'Start immediately and join the live room';

    const minDatetime = new Date(Date.now() + 5 * 60 * 1000)
        .toISOString()
        .slice(0, 16);

    const rowBase = 'flex cursor-pointer items-center justify-between gap-4 rounded-xl border theme-border theme-surface px-5 py-4 transition-colors theme-interactive hover:theme-surface-soft';
    const selectedRow = 'border-[color-mix(in_srgb,var(--qb-primary)_45%,var(--qb-border))] bg-[color-mix(in_srgb,var(--qb-primary)_14%,var(--qb-surface-1))]';

    return (
        <div className="app-page mx-auto space-y-6 animate-in fade-in duration-300">
            <AnimatePresence>
                {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
            </AnimatePresence>

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
                    className={`${rowBase} ${mode === 'instant' ? selectedRow : ''}`}
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
                        onClick={(e) => { e.stopPropagation(); handleGoLiveNow(); }}
                        disabled={submittingAction !== ''}
                        className={`${buttonStyles.primary} w-full rounded-lg px-3 py-1.5 text-sm font-semibold md:w-auto`}
                    >
                        {submittingAction === 'instant' ? 'Launching...' : primaryLabel}
                    </button>
                </div>

                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setMode('schedule')}
                    className={`${rowBase} ${mode === 'schedule' ? selectedRow : ''}`}
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
                        onClick={(e) => { e.stopPropagation(); if (mode !== 'schedule') setMode('schedule'); else handleSchedule(); }}
                        disabled={submittingAction !== ''}
                        className={`${buttonStyles.secondary} w-full rounded-lg px-3 py-1.5 text-sm font-semibold md:w-auto`}
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

export default LaunchQuiz;
