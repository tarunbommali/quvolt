import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import useQuizTimer from '../../hooks/useQuizTimer';
import WaitingLobby from '../../components/quizRoom/WaitingLobby';
import PlayingScreen from '../../components/quizRoom/PlayingScreen';
import FinishedScreen from '../../components/quizRoom/FinishedScreen';
import Loader from '../../components/ui/Loader';
import { useQuizStore } from '../../stores/useQuizStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSocketStore } from '../../stores/useSocketStore';
import ErrorToast from '../../components/quizRoom/ErrorToast';

const hasRenderableQuestionPayload = (question) => {
    if (!question || typeof question !== 'object') return false;
    const hasId = Boolean(question._id);
    const hasText = typeof question.text === 'string' && question.text.trim().length > 0;
    const hasOptions = Array.isArray(question.options) && question.options.length > 0;
    return (hasId || hasText) && hasOptions;
};

const QuizSessionPage = () => {
    const { roomCode } = useParams();
    const user = useAuthStore((state) => state.user);
    const { connected, connectionState, joinRoom, submitAnswer: emitSubmitAnswer } = useSocketStore();
    const getQuizByCodeCached = useQuizStore((state) => state.getQuizByCodeCached);

    // Only record join for genuinely scheduled sessions (quizzes with a scheduledAt field)
    // Avoids polluting joinedParticipants for instant live sessions
    useEffect(() => {
        if (roomCode && user) {
            // Fire-and-forget: look up quiz info from store/cache and only call if scheduled
            api.get(`/quiz/${roomCode}`)
                .then(r => {
                    if (r.data?.scheduledAt) {
                        api.post(`/quiz/join-scheduled/${roomCode}`).catch(() => {});
                    }
                })
                .catch(() => { /* silent – quiz may be live-only */ });
        }
    }, [roomCode, user]);

    const status = useQuizStore((state) => state.status);
    const currentQuestion = useQuizStore((state) => state.currentQuestion);
    const timeLeft = useQuizStore((state) => state.timeLeft);
    const leaderboard = useQuizStore((state) => state.leaderboard);
    const myResult = useQuizStore((state) => state.myResult);
    const participants = useQuizStore((state) => state.participants);
    const answerStats = useQuizStore((state) => state.answerStats);
    const fastestUser = useQuizStore((state) => state.fastestUser);
    const expiry = useQuizStore((state) => state.expiry);
    const quizTitle = useQuizStore((state) => state.quizTitle);
    const selectedOption = useQuizStore((state) => state.selectedOption);
    const errorMessage = useQuizStore((state) => state.errorMessage);
    const abortMessage = useQuizStore((state) => state.abortMessage);
    const sessionId = useQuizStore((state) => state.sessionId);
    const sessionCode = useQuizStore((state) => state.sessionCode);
    const setSelectedOption = useQuizStore((state) => state.setSelectedOption);
    const setTimeLeft = useQuizStore((state) => state.setTimeLeft);
    const setActiveQuiz = useQuizStore((state) => state.setActiveQuiz);
    const setQuizTitle = useQuizStore((state) => state.setQuizTitle);
    const setSessionCode = useQuizStore((state) => state.setSessionCode);
    const resetRealtimeState = useQuizStore((state) => state.resetRealtimeState);
    const hasRenderableQuestion = hasRenderableQuestionPayload(currentQuestion);

    useEffect(() => {
        resetRealtimeState();
        return () => {
            resetRealtimeState();
        };
    }, [resetRealtimeState]);

    useEffect(() => {
        let active = true;

        const hydrateQuizContext = async () => {
            if (!roomCode) return;
            try {
                const quiz = await getQuizByCodeCached(roomCode);
                if (!active || !quiz) return;
                setActiveQuiz(quiz);
                setQuizTitle(quiz.title || '');
                const currentSessionCode = useQuizStore.getState().sessionCode;
                const nextSessionCode = currentSessionCode || quiz.activeSessionCode || quiz.roomCode || roomCode.toUpperCase();
                setSessionCode(nextSessionCode);
            } catch {
                // Socket and route-level errors will handle invalid rooms.
            }
        };

        hydrateQuizContext();

        return () => {
            active = false;
        };
    }, [getQuizByCodeCached, roomCode, setActiveQuiz, setQuizTitle, setSessionCode]);

    // Join room when socket connects and variables are ready
    useEffect(() => {
        if (connected && roomCode && user) {
            const liveRoomCode = sessionCode || roomCode;
            const liveSessionId = sessionId || useQuizStore.getState().activeQuiz?.sessionId;
            joinRoom(liveRoomCode, liveSessionId);
        }
    }, [connected, roomCode, user, joinRoom, sessionId, sessionCode]);

    // Use timer hook
    useQuizTimer(expiry, status, setTimeLeft);

    const submitAnswer = (option) => {
        if (!connected || !user || !hasRenderableQuestion || selectedOption || timeLeft === 0 || status !== 'playing') return;
        setSelectedOption(option);

        // Emit through global Zustand store
        const liveRoomCode = sessionCode || roomCode;
        emitSubmitAnswer(liveRoomCode, sessionId || useQuizStore.getState().activeQuiz?.sessionId, currentQuestion._id, option);
    };

    const isWaitingForHost = (status === 'waiting' || status === 'upcoming')
        || (status === 'live' && !hasRenderableQuestion)
        || (status === 'playing' && !hasRenderableQuestion);
    const waitingMessage = status === 'live' && !currentQuestion
        ? 'Connected. Waiting for host to launch...'
        : 'The quiz session is being prepared. Please wait for the host to begin.';

    // Render loading state
    if (status === 'loading' || (status === 'waiting' && !quizTitle)) {
        return (
            <>
                <ErrorToast message={errorMessage || abortMessage} />
                <Loader className="min-h-[60vh]" />
            </>
        );
    }

    // Keep participants in waiting lobby until a question is actually started.
    if (isWaitingForHost) {
        return (
            <>
                <ErrorToast message={errorMessage || abortMessage} />
                <WaitingLobby
                    quizTitle={quizTitle}
                    participants={participants}
                    connectionState={connectionState}
                    waitingMessage={waitingMessage}
                />
            </>
        );
    }

    // Render finished/completed state
    if (status === 'finished' || status === 'completed') {
        return (
            <>
                <ErrorToast message={errorMessage || abortMessage} />
                <FinishedScreen leaderboard={leaderboard} />
            </>
        );
    }

    // Render playing state
    return (
        <PlayingScreen
            currentQuestion={currentQuestion}
            timeLeft={timeLeft}
            selectedOption={selectedOption}
            myResult={myResult}
            leaderboard={leaderboard}
            participants={participants}
            answerStats={answerStats}
            fastestUser={fastestUser}
            currentUserId={user?._id}
            errorMessage={errorMessage}
            connectionState={connectionState}
            onSubmitAnswer={submitAnswer}
        />
    );
};

export default QuizSessionPage;



