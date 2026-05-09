/**
 * ParticipantSessionPage.jsx
 *
 * Participant-facing quiz session page.
 *
 * Socket lifecycle:
 *  1. On mount → connect socket (if not connected), then emit join_quiz once
 *  2. join_success → update room code in store, show waiting room
 *  3. join_error  → toast + redirect to /join
 *  4. new_question → show question card (driven by useQuizRealtimeStore)
 *  5. quiz_finished → show leaderboard
 *  6. On unmount → clean up socket listeners (via useQuizSocket cleanup)
 *
 * Rules enforced here:
 *  - join_quiz is emitted ONCE (idempotency guard inside useSocketStore.joinRoom)
 *  - No client-side timer/leaderboard calculation
 *  - Answer submission goes through the spec "submit_answer" event
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import { useSocketStore } from '../../../stores/useSocketStore';
import { useQuizStore } from '../../../stores/useQuizStore';
import { useQuizRealtimeStore } from '../../../stores/quiz/useQuizRealtimeStore';
import { useQuizUIStore } from '../../../stores/quiz/useQuizUIStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useQuizSocket } from '../../../hooks/useQuizSocket';
import { useQuizCacheStore } from '../../../stores/quiz/useQuizCacheStore';
import { getSocket } from '../../../sockets/socketClient';
import { SOCKET_EVENTS } from '../../../sockets/socketEvents';
import useToast from '../../../hooks/useToast';

import QuizLoading from '../components/QuizLoading';
import QuizError from '../components/QuizError';
import QuizLeaderboard from '../components/QuizLeaderboard';
import QuizWaitingForHost from '../components/QuizWaitingForHost';
import QuziMCQFeedback from '../components/QuziMCQFeedback';
import QuizQuestionCard from '../components/QuizQuestionCard';
import { Shell, Stat, Label } from '../components/QuizLayouts';

const ParticipantSessionPage = () => {
	const { code } = useParams();
	const navigate = useNavigate();
	const location = useLocation();
	const preferredLanguage = location.state?.preferredLanguage || null;

	const upperCode = code?.toUpperCase();

	// ── Auth ────────────────────────────────────────────────────────────────
	const user = useAuthStore((state) => state.user);

	// ── Socket connection ────────────────────────────────────────────────────
	const { connected, connectSocket, joinRoom } = useSocketStore();

	// ── Realtime state (server-driven) ──────────────────────────────────────
	const status = useQuizRealtimeStore((s) => s.status);
	const quizTitle = useQuizRealtimeStore((s) => s.quizTitle);
	const participants = useQuizRealtimeStore((s) => s.participants);
	const leaderboard = useQuizRealtimeStore((s) => s.leaderboard);
	const currentQuestion = useQuizRealtimeStore((s) => s.currentQuestion);
	const myResult = useQuizRealtimeStore((s) => s.myResult);
	const errorMessage = useQuizRealtimeStore((s) => s.errorMessage);
	const abortMessage = useQuizRealtimeStore((s) => s.abortMessage);
	const resetRealtimeState = useQuizRealtimeStore((s) => s.resetRealtimeState);

	// ── UI state (display only, no socket logic) ────────────────────────────
	const selectedOption = useQuizUIStore((s) => s.selectedOption);
	const setSelectedOption = useQuizUIStore((s) => s.setSelectedOption);

	const { showToast } = useToast();

	// ── Local UI state ───────────────────────────────────────────────────────
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [showFeedback, setShowFeedback] = useState(false);

	// Guard: track whether we have already emitted join_quiz for this code
	const hasJoinedRef = useRef(false);

	// ── Step 1: Connect socket then join room (runs once per code) ───────────
	useEffect(() => {
		if (!upperCode) return;

		// Connect socket if not already connected
		const socket = getSocket();
		if (!socket || !socket.connected) {
			connectSocket();
		}

		// joinRoom is idempotent — safe to call even if already joined
		if (!hasJoinedRef.current) {
			hasJoinedRef.current = true;
			joinRoom(upperCode, null, preferredLanguage);
		}
	}, [upperCode, connectSocket, joinRoom, preferredLanguage]);

	// ── Step 2: Fetch quiz metadata (for title display) ─────────────────────
	useEffect(() => {
		if (!upperCode) return;
		let isMounted = true;

		const fetchQuizMeta = async () => {
			try {
				setLoading(true);
				const quizData = await useQuizCacheStore.getState().getQuizByCodeCached(upperCode);
				if (!isMounted) return;
				useQuizStore.getState().setQuizTitle(quizData?.title || '');
				useQuizStore.getState().setActiveQuiz(quizData);
			} catch (err) {
				if (isMounted) setError(err?.response?.data?.message || 'Failed to load quiz');
			} finally {
				if (isMounted) setLoading(false);
			}
		};

		fetchQuizMeta();
		return () => { isMounted = false; };
	}, [upperCode]);

	// ── Step 3: Cleanup on unmount ───────────────────────────────────────────
	useEffect(() => {
		return () => {
			hasJoinedRef.current = false;
			resetRealtimeState();
		};
	}, [resetRealtimeState]);

	// ── Handle join_error: show toast and redirect ───────────────────────────
	const handleJoinError = useCallback(({ message } = {}) => {
		const msg = message || 'Access denied';
		showToast(msg, 'error');
		navigate('/join', { state: { error: msg }, replace: true });
	}, [navigate, showToast]);

	// ── Handle abort: redirect to /join ─────────────────────────────────────
	useEffect(() => {
		if (abortMessage) {
			showToast('Session was ended by the host.', 'error');
			navigate('/join', { state: { error: abortMessage }, replace: true });
		}
	}, [abortMessage, navigate, showToast]);

	// Direct socket listener for host graceful end (safety net)
	useEffect(() => {
		const socket = getSocket();
		if (!socket) return;
		const onHostEnd = () => {
			showToast('The host has ended the quiz session.', 'info');
			// status becomes 'finished' via store -> renders QuizLeaderboard
		};
		socket.on(SOCKET_EVENTS.QUIZ_ENDED_BY_HOST, onHostEnd);
		return () => socket.off(SOCKET_EVENTS.QUIZ_ENDED_BY_HOST, onHostEnd);
	}, [showToast]);

	// ── Auto-redirect on error message (from store) ──────────────────────────
	// Covers the case where join_error arrived before useQuizSocket was registered
	useEffect(() => {
		if (errorMessage && errorMessage.toLowerCase().includes('denied')) {
			showToast(errorMessage, 'error');
			navigate('/join', { state: { error: errorMessage }, replace: true });
		}
	}, [errorMessage, navigate, showToast]);

	// ── Component-level socket subscriptions ────────────────────────────────
	// useQuizSocket registers listeners ONCE (mount) and cleans up on unmount.
	useQuizSocket({
		roomId: upperCode,
		onJoinError: handleJoinError,
	});

	// ── session:start → request current state to get the first question ─────
	useEffect(() => {
		const socket = getSocket();
		if (!socket) return;

		const onSessionStart = () => {
			// Give the server 300ms to store the session then sync state
			setTimeout(() => {
				socket.emit(SOCKET_EVENTS.SESSION_SYNC, { sessionCode: upperCode });
			}, 300);
		};

		socket.on(SOCKET_EVENTS.SESSION_START, onSessionStart);
		socket.on('session:start', onSessionStart); // alias
		return () => {
			socket.off(SOCKET_EVENTS.SESSION_START, onSessionStart);
			socket.off('session:start', onSessionStart);
		};
	}, [upperCode]);

	// ── Watchdog: request state sync if next question is late ────────────────
	useEffect(() => {
		const socket = getSocket();
		if (!socket) return;

		let watchdog = null;

		const onTimerEnd = () => {
			watchdog = setTimeout(() => {
				socket.emit(SOCKET_EVENTS.SESSION_SYNC, { sessionCode: upperCode });
			}, 2500);
		};

		const cancelWatchdog = () => {
			if (watchdog) clearTimeout(watchdog);
		};

		socket.on(SOCKET_EVENTS.TIMER_END, onTimerEnd);
		socket.on(SOCKET_EVENTS.NEW_QUESTION, cancelWatchdog);
		socket.on(SOCKET_EVENTS.QUESTION_UPDATE, cancelWatchdog);

		return () => {
			if (watchdog) clearTimeout(watchdog);
			socket.off(SOCKET_EVENTS.TIMER_END, onTimerEnd);
			socket.off(SOCKET_EVENTS.NEW_QUESTION, cancelWatchdog);
			socket.off(SOCKET_EVENTS.QUESTION_UPDATE, cancelWatchdog);
		};
	}, [upperCode]);

	const activeQuiz = useQuizStore((s) => s.activeQuiz);

	// ── Tab Switch Detection ──────────────────────────────────────────────────
	useEffect(() => {
		const template = activeQuiz?.templateId || activeQuiz?.template;
		const tabDetectionEnabled = template?.advanced?.tabSwitchDetection || activeQuiz?.advanced?.tabSwitchDetection;

		if (!tabDetectionEnabled) return;

		const handleVisibilityChange = () => {
			if (document.visibilityState === 'hidden') {
				const socket = getSocket();
				if (socket) {
					socket.emit('leave_quiz', {
						roomCode: upperCode,
						reason: 'tab switch detection'
					});
				}
				showToast('You have been removed from the session for switching tabs.', 'error');
				navigate('/join', { state: { error: 'Removed due to tab switch detection' }, replace: true });
			}
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
	}, [activeQuiz, upperCode, navigate, showToast]);

	// ── Submit answer ────────────────────────────────────────────────────────
	const handleAnswer = useCallback((option) => {
		if (selectedOption || myResult) return;

		setSelectedOption(option);

		const socket = getSocket();
		socket?.emit('submit_answer', {
			roomCode: upperCode,
			questionId: currentQuestion?._id,
			selectedOption: option,
		});
	}, [selectedOption, myResult, upperCode, currentQuestion, setSelectedOption]);

	// ── Show feedback overlay briefly when result arrives ───────────────────
	useEffect(() => {
		if (!myResult) return;
		setShowFeedback(true);
		const timer = setTimeout(() => setShowFeedback(false), 1500);
		return () => clearTimeout(timer);
	}, [myResult]);

	// ─────────────────────────────────────────────────────────────────────────
	// RENDERING
	// ─────────────────────────────────────────────────────────────────────────

	if (loading) return <QuizLoading code={code} />;
	if (error || (errorMessage && !errorMessage.toLowerCase().includes('denied'))) {
		return <QuizError message={error || errorMessage} />;
	}

	if (status === 'finished' || status === 'completed') {
		return <QuizLeaderboard leaderboard={leaderboard} user={user} />;
	}

	if (status === 'playing' || status === 'live' || currentQuestion) {
		return (
			<Shell>
				{/* Fixed top bar */}
				<div className="fixed top-0 left-0 w-full z-30 surface-card border-b theme-border px-5 py-3 flex items-center justify-between shadow-sm">
					<div className="flex items-center gap-2.5">
						<span className="px-2.5 py-1 rounded-lg bg-[color-mix(in_srgb,var(--qb-primary)_12%,var(--qb-surface-1))] text-[var(--qb-primary)] text-[10px] font-black uppercase tracking-widest">
							Live
						</span>
						<span className="text-sm font-bold theme-text-primary truncate max-w-[180px]">{quizTitle}</span>
					</div>
					<div className="text-right">
						<Label>Progress</Label>
						<p className="text-sm font-black theme-text-primary tabular-nums leading-none mt-0.5">
							{(currentQuestion?.index ?? 0) + 1} / {currentQuestion?.total ?? '—'}
						</p>
					</div>
				</div>

				{/* Question content */}
				<div className="max-w-2xl mx-auto px-5 pt-24 pb-12 space-y-5">
					<QuizQuestionCard
						currentQuestion={currentQuestion}
						myResult={myResult}
						selectedOption={selectedOption}
						handleAnswer={handleAnswer}
						preferredLanguage={preferredLanguage}
					/>
				</div>

				{/* Answer feedback overlay */}
				<AnimatePresence>
					<QuziMCQFeedback myResult={myResult} showFeedback={showFeedback} />
				</AnimatePresence>
			</Shell>
		);
	}

	// Waiting room (lobby)
	return (
		<QuizWaitingForHost
			quizTitle={quizTitle}
			code={code}
			participants={participants}
			socketConnected={connected}
		/>
	);
};

export default ParticipantSessionPage;
