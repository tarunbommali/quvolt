import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { startLiveSession } from '../../services/api';
import Toast from '../../components/common/Toast';
import useToast from '../../hooks/useToast';
import LiveLoading from '../../components/organizerLive/LiveLoading';
import LiveLobby from '../../components/organizerLive/LiveLobby';
import { useQuizStore } from '../../stores/useQuizStore';
import { useSocketStore } from '../../stores/useSocketStore';
import { resolveSessionRoute } from '../../utils/sessionRouteResolver';

const QuizLobbyPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const joinRoom = useSocketStore((state) => state.joinRoom);
    const startQuizSocketBroadcast = useSocketStore((state) => state.startQuizBroadcast);
    const realtimeError = useSocketStore((state) => state.lastError);
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
                const nextStatus = nextCode && normalizedStatus !== 'live'
                    ? 'waiting'
                    : (normalizedStatus || 'waiting');
                const hasStatusChanged = String(quiz.status) !== nextStatus;
                const hasCodeDiff = !quiz.sessionCode && nextCode;
                
                if (hasStatusChanged || hasCodeDiff) {
                    const nextQuiz = {
                        ...quiz,
                        status: nextStatus,
                        ...(nextCode ? { sessionCode: nextCode } : {}),
                    };
                    setActiveQuiz(nextQuiz);
                }

                if (nextCode && sessionCode !== nextCode) setSessionCode(nextCode);
                setStatus(nextStatus);

                setLoading(false);
            } catch (error) {
                if (!active) return;
                console.error('[QuizLobbyPage] init error:', error);
                showToast(`Invite room error: ${error?.message || 'Unknown'}`);
                navigate('/studio');
            }
        };

        initInviteRoom();

        return () => {
            active = false;
        };
    }, [activeQuiz, getQuizzesForParent, id, location.pathname, navigate, setActiveQuiz, setSessionCode, setStatus, showToast]);

    useEffect(() => {
        if (loading || !activeQuiz) return;
        const hostJoinRoomCode = sessionCode || activeQuiz.activeSessionCode || activeQuiz.sessionCode || activeQuiz.roomCode;
        if (!hostJoinRoomCode) return;
        joinRoom(hostJoinRoomCode, activeQuiz.sessionId);
    }, [loading, activeQuiz, sessionCode, joinRoom]);

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
                await api.post(`/quiz/${activeQuiz._id}/abort`, { sessionCode });
                
                // Clear state so returning to this quiz won't try to reuse the session
                const resetQuiz = { 
                    ...activeQuiz, 
                    status: 'aborted', 
                    sessionCode: null, 
                    activeSessionCode: null 
                };
                setActiveQuiz(resetQuiz);
                setSessionCode(null);
                setStatus('aborted');

                // Force refresh the studio items in the background
                useQuizStore.getState().getQuizzesForParent('none', { force: true }).catch(() => {});
                if (activeQuiz.parentId) {
                    useQuizStore.getState().getQuizzesForParent(activeQuiz.parentId, { force: true }).catch(() => {});
                }
            }
        } catch {
            // best-effort abort
        } finally {
            navigate('/studio');
        }
    };

    if (loading) return <LiveLoading />;

    return (
        <>
            <AnimatePresence>
                {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
            </AnimatePresence>
            <LiveLobby
                activeQuiz={activeQuiz}
                joinCode={sessionCode || activeQuiz?.activeSessionCode || activeQuiz?.sessionCode || activeQuiz?.roomCode}
                participants={participants}
                navigate={navigate}
                startQuizBroadcast={startQuizBroadcast}
                showToast={showToast}
                onAbort={handleAbort}
                realtimeError={realtimeError}
            />
        </>
    );
};

export default QuizLobbyPage;

