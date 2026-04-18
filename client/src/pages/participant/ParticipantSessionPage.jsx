import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useSocketStore } from '../../stores/useSocketStore';
import { useQuizStore } from '../../stores/useQuizStore';
import { useAuthStore } from '../../stores/useAuthStore';

import QuizLoading from './quiz/QuizLoading';
import QuizError from './quiz/QuizError';
import QuizLeaderboard from './quiz/QuizLeaderboard';
import QuizWaitingForHost from './quiz/QuizWaitingForHost';
import QuziMCQFeedback from './quiz/QuziMCQFeedback';
import QuizQuestionCard from './quiz/QuizQuestionCard';
import { Shell, Stat, Label, CenterCard } from './quiz/QuizLayouts';

const ParticipantSessionPage = () => {
	const { code } = useParams();
	const navigate = useNavigate();

	// Stores
	const user = useAuthStore((state) => state.user);
	const { socket, connected, connectSocket, joinRoom } = useSocketStore();
	const {
		status,
		view,
		quizTitle,
		participants,
		leaderboard,
		currentQuestion,
		selectedOption,
		myResult,
		errorMessage,
		abortMessage,
		setSelectedOption,
		setView,
		getQuizByCodeCached,
		resetRealtimeState,
	} = useQuizStore();

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [showFeedback, setShowFeedback] = useState(false);

	// ── Init & socket connection ─────────────────────────────────────────────
	useEffect(() => {
		let isMounted = true;

		const initSession = async () => {
			if (!code) return;
			try {
				setLoading(true);
				setError(null);

				const quizData = await getQuizByCodeCached(code.toUpperCase());
				if (!isMounted) return;

				useQuizStore.getState().setQuizTitle(quizData?.title || '');
				useQuizStore.getState().setActiveQuiz(quizData);

				if (!socket || !connected) connectSocket();
				joinRoom(code.toUpperCase());
			} catch (err) {
				if (isMounted) {
					setError(err?.response?.data?.message || 'Failed to join session. Check the code and try again.');
				}
			} finally {
				if (isMounted) setLoading(false);
			}
		};

		initSession();
		return () => { isMounted = false; };
	}, [code, connectSocket, joinRoom, socket, connected, getQuizByCodeCached]);

	// ── Cleanup ──────────────────────────────────────────────────────────────
	useEffect(() => () => resetRealtimeState(), [resetRealtimeState]);

	// ── Redirect on abort ────────────────────────────────────────────────────
	useEffect(() => {
		if (abortMessage) navigate('/join', { state: { error: abortMessage } });
	}, [abortMessage, navigate]);

	// ── Auto-transition view states ──────────────────────────────────────────
	useEffect(() => {
		if ((status === 'live' || status === 'playing') && view !== 'live') {
			setView('live');
		} else if (status === 'completed' && view !== 'finished') {
			setView('finished');
		}
	}, [status, view, setView]);

	// ── Watchdog: request state sync if next question is late ────────────────
	useEffect(() => {
		if (!socket) return;
		let watchdog = null;
		const onTimerEnd = () => {
			watchdog = setTimeout(() => {
				socket.emit('session:syncState', { sessionCode: code?.toUpperCase() });
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
	}, [socket, code]);

	// ── Submit answer ────────────────────────────────────────────────────────
	const handleAnswer = (option) => {
		if (selectedOption || myResult) return;
		setSelectedOption(option);
		socket?.emit('submit_answer', {
			roomCode: code?.toUpperCase(),
			questionId: currentQuestion?._id,
			selectedOption: option,
		});
	};

	// Show feedback for 1.5 seconds when myResult populates
	useEffect(() => {
		if (myResult) {
			setShowFeedback(true);
			const t = setTimeout(() => setShowFeedback(false), 1500);
			return () => clearTimeout(t);
		}
	}, [myResult]);

	// ─────────────────────────────────────────────────────────────────────────
	// RENDERING
	// ─────────────────────────────────────────────────────────────────────────
	if (loading) return <QuizLoading code={code} />;
	if (error || errorMessage) return <QuizError message={error || errorMessage} />;

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

				{/* Content */}
				<div className="max-w-2xl mx-auto px-5 pt-24 pb-12 space-y-5">
					<QuizQuestionCard
						currentQuestion={currentQuestion}
						myResult={myResult}
						selectedOption={selectedOption}
						handleAnswer={handleAnswer}
					/>
				</div>

				{/* Results Overlay */}
				<AnimatePresence>
					<QuziMCQFeedback myResult={myResult} showFeedback={showFeedback} />
				</AnimatePresence>
			</Shell>
		);
	}

	return <QuizWaitingForHost quizTitle={quizTitle} code={code} participants={participants} socketConnected={connected} />;
};

export default ParticipantSessionPage;
