import { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import api, {
    pauseQuizSession,
    resumeQuizSession,
    nextQuestion as apiNextQuestion,
} from '../../services/api';
import Toast from '../../components/common/Toast';
import useToast from '../../hooks/useToast';
import LiveLoading from '../../components/hostLive/LiveLoading';
import LiveView from '../../components/hostLive/LiveView';
import LiveResult from '../../components/hostLive/LiveResult';
import { useQuizStore } from '../../stores/useQuizStore';
import { useSocketStore } from '../../stores/useSocketStore';
import { resolveSessionRoute } from '../../utils/sessionRouteResolver';

const LiveSessionPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const joinRoom = useSocketStore((state) => state.joinRoom);
    const realtimeError = useSocketStore((state) => state.lastError);
    const getQuizzesForParent = useQuizStore((state) => state.getQuizzesForParent);

    const activeQuiz = useQuizStore((state) => state.activeQuiz);
    const view = useQuizStore((state) => state.view);
    const sessionMode = useQuizStore((state) => state.sessionMode);
    const participants = useQuizStore((state) => state.participants);
    const leaderboard = useQuizStore((state) => state.leaderboard);
    const currentQuestion = useQuizStore((state) => state.currentQuestion);
    const timeLeft = useQuizStore((state) => state.timeLeft);
    const answerStats = useQuizStore((state) => state.answerStats);
    const fastestUser = useQuizStore((state) => state.fastestUser);
    const expiry = useQuizStore((state) => state.expiry);
    const sessionCode = useQuizStore((state) => state.sessionCode);
    const setActiveQuiz = useQuizStore((state) => state.setActiveQuiz);
    const setView = useQuizStore((state) => state.setView);
    const setTimeLeft = useQuizStore((state) => state.setTimeLeft);
    const setSessionCode = useQuizStore((state) => state.setSessionCode);
    const setStatus = useQuizStore((state) => state.setStatus);
    const resetRealtimeState = useQuizStore((state) => state.resetRealtimeState);
    const isPaused = useQuizStore((state) => state.isPaused);
    const effectiveJoinCode = sessionCode || activeQuiz?.sessionCode || activeQuiz?.activeSessionCode || activeQuiz?.roomCode;

    useEffect(() => {
        resetRealtimeState();
        setView('loading');
        return () => {
            resetRealtimeState();
        };
    }, [resetRealtimeState, setView]);

    useEffect(() => {
        if (location.state?.quiz) {
            setActiveQuiz(location.state.quiz);
        }
    }, [location.state?.quiz, setActiveQuiz]);
    const { toast, showToast, clearToast } = useToast();

    // â”€â”€â”€ Initial load â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    useEffect(() => {
        if (view !== 'loading') return;

        let active = true;

        const initSession = async () => {
            try {
                let quiz = activeQuiz;
                if (!quiz) {
                    let quizzes = await getQuizzesForParent('none');
                    quiz = quizzes.find(q => q._id === id);

                    // If not found in cache, it might be a newly created quiz. Force refresh!
                    if (!quiz) {
                        quizzes = await getQuizzesForParent('none', { force: true });
                        quiz = quizzes.find(q => q._id === id);
                    }

                    if (!quiz) throw new Error('Quiz not found');
                    if (!active) return;
                    setActiveQuiz(quiz);
                }

                if (!active) return;

                const expectedRoute = resolveSessionRoute(quiz);
                if (location.pathname !== expectedRoute) {
                    navigate(expectedRoute, { replace: true, state: { quiz } });
                    return;
                }

                setSessionCode(quiz.sessionCode || quiz.activeSessionCode || quiz.roomCode);
                setStatus('live');
                setView('live');
            } catch {
                if (active) {
                    showToast('Failed to load quiz');
                    navigate('/studio');
                }
            }
        };

        initSession();

        return () => {
            active = false;
        };
    }, [view, activeQuiz, id, location.pathname, navigate, showToast, getQuizzesForParent, setActiveQuiz, setSessionCode, setStatus, setView]);

    useEffect(() => {
        if (view !== 'live' || !activeQuiz || !effectiveJoinCode) return;
        const hostJoinRoomCode = effectiveJoinCode || activeQuiz?.activeSessionCode || activeQuiz?.sessionCode || activeQuiz?.roomCode;
        joinRoom(hostJoinRoomCode, activeQuiz?.sessionId);
    }, [view, activeQuiz, effectiveJoinCode, joinRoom]);

    // â”€â”€â”€ Client-side timer sync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    useEffect(() => {
        if (!expiry || view !== 'live') return;
        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
            setTimeLeft(remaining);
            if (remaining === 0) clearInterval(interval);
        }, 500);
        return () => clearInterval(interval);
    }, [expiry, view, setTimeLeft]);

    // Watchdog: if next question does not arrive 2.5s after timer:end, sync state
    const socket = useSocketStore((state) => state.socket);
    useEffect(() => {
        if (!socket || view !== 'live') return;
        let watchdog = null;
        const onTimerEnd = () => {
            watchdog = setTimeout(() => {
                socket.emit('session:syncState', { sessionCode: effectiveJoinCode });
            }, 2500);
        };
        const cancelWatchdog = () => { if (watchdog) clearTimeout(watchdog); };
        socket.on('timer:end', onTimerEnd);
        socket.on('new_question', cancelWatchdog);
        socket.on('question:update', cancelWatchdog);
        return () => {
            if (watchdog) clearTimeout(watchdog);
            socket.off('timer:end', onTimerEnd);
            socket.off('new_question', cancelWatchdog);
            socket.off('question:update', cancelWatchdog);
        };
    }, [socket, view, effectiveJoinCode]);

    // â”€â”€â”€ Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleAbort = async () => {
        try {
            if (activeQuiz) {
                await api.post(`/quiz/${activeQuiz._id}/abort`, { sessionCode });
            }
        } catch {
            // best-effort â€” still navigate away
        } finally {
            navigate('/studio');
        }
    };

    const handlePause = async () => {
        if (!activeQuiz || !sessionCode) return;
        try {
            await pauseQuizSession(activeQuiz._id, sessionCode);
        } catch {
            showToast('Failed to pause quiz');
        }
    };

    const handleResume = async () => {
        if (!activeQuiz || !sessionCode) return;
        try {
            await resumeQuizSession(activeQuiz._id, sessionCode);
        } catch {
            showToast('Failed to resume quiz');
        }
    };

    const handleNextQuestion = async () => {
        if (!activeQuiz || !sessionCode) return;
        try {
            await apiNextQuestion(activeQuiz._id, sessionCode);
        } catch {
            showToast('Failed to trigger next question');
        }
    };

    // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (view === 'loading') return <LiveLoading />;

    if (view === 'results') {
        return (
            <>
                <AnimatePresence>
                    {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
                </AnimatePresence>
                <LiveResult
                    activeQuiz={activeQuiz}
                    leaderboard={leaderboard}
                    navigate={navigate}
                    sessionCode={sessionCode}
                />
            </>
        );
    }

    if (view === 'live') {
        return (
            <>
                <AnimatePresence>
                    {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
                </AnimatePresence>
                <LiveView
                    activeQuiz={activeQuiz}
                    sessionMode={sessionMode}
                    joinCode={effectiveJoinCode}
                    currentQuestion={currentQuestion}
                    timeLeft={timeLeft}
                    answerStats={answerStats}
                    fastestUser={fastestUser}
                    participants={participants}
                    leaderboard={leaderboard}
                    navigate={navigate}
                    isPaused={isPaused}
                    realtimeError={realtimeError}
                    onPause={handlePause}
                    onResume={handleResume}
                    onNext={handleNextQuestion}
                    onAbort={handleAbort}
                />
            </>
        );
    }

    return null;
};

export default LiveSessionPage;


