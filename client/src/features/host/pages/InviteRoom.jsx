import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { Play, Zap, Clock, Copy, Check, Settings2 } from 'lucide-react';
import { startLiveSession, abortSession, getSessionState } from '../services/host.service';
import Toast from '../../../components/common/Toast';
import useToast from '../../../hooks/useToast';
import LoadingScreen from '../../../components/common/LoadingScreen';
import SubHeader from '../../../components/layout/SubHeader';
import ErrorState from '../../../components/common/ErrorState';
import { LivePulseBadge } from '../../../components/common/ui';
import { useQuizStore } from '../../../stores/useQuizStore';
import { useSocketStore } from '../../../stores/useSocketStore';
import { resolveSessionRoute } from '../../../utils/sessionRouteResolver';
import { buttonStyles } from '../../../styles/buttonStyles';
import { motionTokens } from '../../../design/motion';


// Formats ms remaining into HH:MM:SS
const formatCountdown = (ms) => {
    if (ms <= 0) return '00:00:00';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
};

const InviteRoom = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Socket Store
    const connectSocket = useSocketStore((state) => state.connectSocket);
    const socket = useSocketStore((state) => state.socket);
    const connected = useSocketStore((state) => state.connected);
    const joinRoom = useSocketStore((state) => state.joinRoom);
    const startQuizSocketBroadcast = useSocketStore((state) => state.startQuizBroadcast);
    const realtimeError = useSocketStore((state) => state.lastError);

    // Quiz Store
    const getQuizzesForParent = useQuizStore((state) => state.getQuizzesForParent);
    const activeQuiz = useQuizStore((state) => state.activeQuiz);
    const sessionCode = useQuizStore((state) => state.sessionCode);
    const participants = useQuizStore((state) => state.participants);
    const setActiveQuiz = useQuizStore((state) => state.setActiveQuiz);
    const setSessionCode = useQuizStore((state) => state.setSessionCode);
    const setStatus = useQuizStore((state) => state.setStatus);
    const resetRealtimeState = useQuizStore((state) => state.resetRealtimeState);

    const { toast, showToast, clearToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const [now, setNow] = useState(Date.now());

    const scheduledAt = activeQuiz?.scheduledAt;
    const isScheduled = !!scheduledAt;
    const scheduledDate = useMemo(() => (scheduledAt ? new Date(scheduledAt) : null), [scheduledAt]);
    const displayedCode = sessionCode || activeQuiz?.activeSessionCode || activeQuiz?.sessionCode || activeQuiz?.roomCode;

    const joinUrl = `${window.location.origin}/join/${displayedCode}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}&bgcolor=f8fafc&color=4f46e5&margin=10`;

    const countdown = useMemo(() => {
        if (!isScheduled || !scheduledDate) return 0;
        return scheduledDate.getTime() - now;
    }, [isScheduled, scheduledDate, now]);

    const canLaunch = !isScheduled || countdown <= 0;

    useEffect(() => {
        return () => resetRealtimeState();
    }, [resetRealtimeState]);

    useEffect(() => {
        if (location.state?.quiz) {
            setActiveQuiz(location.state.quiz);
        }
    }, [location.state?.quiz, setActiveQuiz]);

    useEffect(() => {
        let active = true;

        const initInviteRoom = async () => {
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

                const nextCode = quiz.sessionCode || quiz.activeSessionCode || quiz.roomCode;
                const normalizedStatus = String(quiz.status || '').toLowerCase();
                const isFinalStatus = ['live', 'finished', 'completed', 'aborted'].includes(normalizedStatus);
                const nextStatus = nextCode && !isFinalStatus
                    ? 'waiting'
                    : (normalizedStatus || 'waiting');

                if (String(quiz.status) !== nextStatus || (!quiz.sessionCode && nextCode)) {
                    const nextQuiz = { ...quiz, status: nextStatus, ...(nextCode ? { sessionCode: nextCode } : {}) };
                    setActiveQuiz(nextQuiz);
                }

                if (nextCode && sessionCode !== nextCode) setSessionCode(nextCode);
                setStatus(nextStatus);

                setLoading(false);
            } catch (error) {
                if (!active) return;
                showToast(`Invite room error: ${error?.message || 'Unknown'}`);
                navigate('/studio');
            }
        };

        initInviteRoom();
        return () => { active = false; };
    }, [activeQuiz?._id, getQuizzesForParent, id, navigate, setActiveQuiz, setSessionCode, setStatus, showToast]);

    const status = useQuizStore((state) => state.status);

    useEffect(() => {
        if (!activeQuiz) return undefined;
        const code = sessionCode || activeQuiz.activeSessionCode || activeQuiz.sessionCode || activeQuiz.roomCode;
        if (!code) return undefined;

        if (!socket || !connected) connectSocket();
        joinRoom(code.toUpperCase(), activeQuiz.sessionId);

        // Listen for session:start to handle cases where HTTP call is slow/timeouts
        const handleSessionStart = (data) => {
            console.log('[InviteRoom] Received session:start via socket', data);
            if (activeQuiz && (data.roomCode === code.toUpperCase() || data.status === 'live')) {
                setStatus('live');
            }
        };

        socket?.on('session:start', handleSessionStart);
        socket?.on('quiz:started', handleSessionStart);

        return () => {
            socket?.off('session:start', handleSessionStart);
            socket?.off('quiz:started', handleSessionStart);
        };
    }, [activeQuiz?._id, sessionCode, joinRoom, socket, connected, connectSocket, setStatus]);

    // Force navigation when status becomes live (catches both HTTP success and socket fallback)
    useEffect(() => {
        if (status === 'live' && activeQuiz?._id) {
            console.log('[InviteRoom] Session is live, navigating to console...');
            const route = resolveSessionRoute(activeQuiz);
            navigate(route, { replace: true, state: { quiz: { ...activeQuiz, status: 'live' } } });
        }
    }, [status, activeQuiz, navigate]);

    useEffect(() => {
        if (!isScheduled || !scheduledDate) return undefined;
        const tid = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(tid);
    }, [isScheduled, scheduledDate]);

    // Heartbeat for participant sync
    useEffect(() => {
        const code = sessionCode || activeQuiz?.activeSessionCode || activeQuiz?.roomCode;
        if (!code) return undefined;

        const tid = setInterval(async () => {
            try {
                const response = await getSessionState(code.toUpperCase());
                if (response.success && response.data.participants) {
                    useQuizStore.getState().setParticipants(response.data.participants);
                }
            } catch (err) {
                console.warn('[InviteHeartbeat] Sync failed:', err.message);
            }
        }, 5000);

        return () => clearInterval(tid);
    }, [activeQuiz?._id, sessionCode]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(joinUrl);
        setCopied(true);
        showToast('Link copied!', 'success');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(displayedCode);
        setCopiedCode(true);
        showToast('Code copied!', 'success');
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const startQuizBroadcast = async () => {
        const code = sessionCode || activeQuiz?.sessionCode || activeQuiz?.activeSessionCode || activeQuiz?.roomCode;
        if (!activeQuiz?._id) return;

        try {
            const updatedQuiz = await startLiveSession(activeQuiz?._id);
            const nextCode = updatedQuiz?.sessionCode || updatedQuiz?.activeSessionCode || updatedQuiz?.roomCode || code;
            const nextQuiz = { ...activeQuiz, ...updatedQuiz, status: 'live', sessionCode: nextCode };

            setActiveQuiz(nextQuiz);
            setSessionCode(nextCode);
            setStatus('live');

            if (nextCode) startQuizSocketBroadcast(nextCode, nextQuiz?.sessionId);
            navigate(resolveSessionRoute(nextQuiz), { replace: true, state: { quiz: nextQuiz } });
        } catch (error) {
            showToast(error?.response?.data?.message || error?.message || 'Failed to launch live session');
        }
    };

    const handleAbort = async () => {
        try {
            if (activeQuiz) {
                await abortSession(activeQuiz._id, sessionCode);
                setActiveQuiz({ ...activeQuiz, status: 'aborted', sessionCode: null, activeSessionCode: null });
                setSessionCode(null);
                setStatus('aborted');
                useQuizStore.getState().getQuizzesForParent('none', { force: true }).catch(() => { });
            }
        } catch { /* best effort */ }
        finally { navigate('/studio'); }
    };

    if (loading || !activeQuiz) return <LoadingScreen />;

    return (
        <div className="app-page mx-auto space-y-6 animate-in fade-in duration-300">
            <AnimatePresence>
                {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
            </AnimatePresence>

            <SubHeader
                title="Invite Room"
                subtitle={`Active: ${activeQuiz.title}`}
                breadcrumbs={[
                    { label: 'Studio', href: '/studio' },
                    { label: activeQuiz.title },
                    { label: 'Invite Room' },
                ]}
                actions={(
                    <button type="button" onClick={handleAbort} className={`${buttonStyles.danger} rounded-xl px-4 py-2 text-xs font-bold`}>
                        Abort
                    </button>
                )}
            />

            <section className="space-y-4">
                {realtimeError && <ErrorState title="Realtime sync issue" message={realtimeError} />}

                {isScheduled && scheduledDate && !canLaunch && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border theme-border theme-surface px-5 py-4">
                        <div className="flex items-center gap-3">
                            <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                                <Clock size={16} />
                            </span>
                            <div>
                                <p className="text-sm font-semibold theme-text-primary">Scheduled Session</p>
                                <p className="text-xs theme-text-muted">
                                    Starts at {scheduledDate.toLocaleString('en-IN', {
                                        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                                    })}
                                </p>
                            </div>
                        </div>
                        <p className="text-lg font-black tracking-wide text-indigo-600 tabular-nums">{formatCountdown(countdown)}</p>
                    </div>
                )}

                <Motion.div
                    initial={motionTokens.fadeUp.hidden}
                    animate={motionTokens.fadeUp.visible}
                    transition={motionTokens.transition.smooth}
                    className="flex items-center justify-between gap-4 rounded-xl border theme-border theme-surface px-5 py-4"
                >
                    <div className="space-y-2">
                        <div className="space-y-1">
                            <p className="text-xs font-bold theme-text-muted">{isScheduled ? 'Permanent code' : 'Live session code'}</p>
                            <p className="text-xl font-black tracking-widest theme-text-primary">{displayedCode}</p>
                        </div>
                        <LivePulseBadge count={participants.length} label="users connected" />
                    </div>
                    <button type="button" onClick={handleCopyCode} className={`${buttonStyles.secondary} rounded-lg px-3 py-1.5 text-sm font-semibold`}>
                        {copiedCode ? 'Copied' : 'Copy Code'}
                    </button>
                </Motion.div>

                <div className="flex flex-col gap-3 rounded-xl border theme-border theme-surface px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-bold theme-text-muted">Join link</p>
                        <p className="max-w-2xl truncate text-sm font-medium theme-text-primary">{joinUrl}</p>
                    </div>
                    <button type="button" onClick={handleCopyLink} className={`${buttonStyles.secondary} rounded-lg px-3 py-1.5 text-sm font-semibold`}>
                        {copied ? 'Copied' : 'Copy Link'}
                    </button>
                </div>

                <div className="flex flex-col gap-3 rounded-xl border theme-border theme-surface px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                            <Play size={16} className="fill-indigo-600" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold theme-text-primary">Start Quiz Session</p>
                            <p className="text-sm theme-text-muted">Launch the room for participants and begin real-time flow</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => navigate(`/quiz/templates/${id}/settings`)}
                            title="Session settings"
                            className={`${buttonStyles.secondary} rounded-lg px-2.5 py-1.5 text-sm font-semibold`}
                        >
                            <Settings2 size={15} />
                        </button>
                        <button
                            type="button"
                            onClick={startQuizBroadcast}
                            disabled={isScheduled && !canLaunch}
                            className={`${buttonStyles.primary} rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-60`}
                        >
                            Launch Session
                        </button>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border theme-border theme-surface p-4">
                    <h3 className="text-xs font-bold theme-text-muted">Join QR</h3>
                    <div className="mt-3 flex flex-col items-center gap-3">
                        <img src={qrUrl} alt="Quiz QR Code" className="h-48 w-48 rounded-xl border theme-border" />
                        <p className="text-xs theme-text-muted">Scan to join with code {displayedCode}</p>
                    </div>
                </div>

                <Motion.div
                    initial={motionTokens.fadeUp.hidden}
                    animate={motionTokens.fadeUp.visible}
                    transition={motionTokens.transition.smooth}
                    className="rounded-xl border theme-border theme-surface p-4"
                >
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-xs font-bold theme-text-muted">Participants</h3>
                            <p className="mt-1 text-[11px] font-semibold theme-text-muted">Connected: {participants.length}</p>
                        </div>
                        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">{participants.length}</span>
                    </div>

                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                        {participants.map((p, i) => (
                            <Motion.div
                                initial={motionTokens.fadeUp.hidden}
                                animate={motionTokens.fadeUp.visible}
                                transition={{ ...motionTokens.transition.snappy, delay: i * 0.03 }}
                                key={p._id || i}
                                className="flex items-center gap-2 rounded-lg border theme-border theme-surface-soft px-3 py-2 text-sm font-medium theme-text-primary"
                            >
                                <span className="h-2 w-2 rounded-full bg-green-500" />
                                {p.name}
                            </Motion.div>
                        ))}
                    </div>
                </Motion.div>
            </section>
        </div>
    );
};

export default InviteRoom;

