import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Clock, Zap, Trophy, Loader2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useSocketStore } from '../../stores/useSocketStore';
import { useQuizStore } from '../../stores/useQuizStore';
import { useAuthStore } from '../../stores/useAuthStore';
import OptionButton from '../../components/common/OptionButton';
import { cx } from '../../styles/theme';

// ── Typography helpers (keeps JSX clean) ──────────────────────────────────────
const Label = ({ children, className = '' }) => (
	<span className={`text-[10px] font-bold uppercase tracking-widest theme-text-muted ${className}`}>
		{children}
	</span>
);

const Stat = ({ label, value, accent }) => (
	<div className="flex flex-col items-center gap-0.5">
		<Label>{label}</Label>
		<span className={`text-2xl font-black tabular-nums ${accent ?? 'theme-text-primary'}`}>{value}</span>
	</div>
);

// ── Page shell ─────────────────────────────────────────────────────────────────
const Shell = ({ children }) => (
	<div className="min-h-screen theme-surface-soft theme-text-primary overflow-x-hidden font-sans">
		{children}
	</div>
);

// ── Centered card wrapper (loading / error / finished) ─────────────────────────
const CenterCard = ({ children }) => (
	<div className="min-h-screen flex items-center justify-center p-6">
		<div className="w-full max-w-sm">{children}</div>
	</div>
);

// ── Simple token-based card ────────────────────────────────────────────────────
const Card = ({ children, className = '' }) => (
	<div className={`surface-card rounded-2xl p-6 ${className}`}>{children}</div>
);

// ──────────────────────────────────────────────────────────────────────────────

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

	// ── Auto-transition to live view ─────────────────────────────────────────
	useEffect(() => {
		if ((status === 'live' || status === 'playing') && view !== 'live') setView('live');
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
	// LOADING
	// ─────────────────────────────────────────────────────────────────────────
	if (loading) {
		return (
			<Shell>
				<CenterCard>
					<div className="flex flex-col items-center gap-5 text-center">
						<div className="w-14 h-14 rounded-2xl theme-status-info flex items-center justify-center">
							<Loader2 size={28} className="animate-spin" />
						</div>
						<div>
							<p className="font-black theme-text-primary">Syncing Session</p>
							<p className="text-sm theme-text-secondary mt-1">
								Joining <span className="font-black text-[var(--qb-primary)]">{code?.toUpperCase()}</span>…
							</p>
						</div>
					</div>
				</CenterCard>
			</Shell>
		);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// ERROR
	// ─────────────────────────────────────────────────────────────────────────
	if (error || errorMessage) {
		return (
			<Shell>
				<CenterCard>
					<Card className="text-center space-y-5">
						<div className="w-12 h-12 rounded-2xl theme-status-danger flex items-center justify-center mx-auto">
							<AlertCircle size={22} />
						</div>
						<div>
							<p className="font-black theme-text-primary">Something went wrong</p>
							<p className="text-sm theme-tone-danger mt-1 font-semibold">{error || errorMessage}</p>
						</div>
						<button
							onClick={() => navigate('/join')}
							className="w-full h-11 rounded-xl bg-[var(--qb-primary)] hover:bg-[var(--qb-primary-strong)] text-white text-sm font-bold transition-colors"
						>
							Back to Join
						</button>
					</Card>
				</CenterCard>
			</Shell>
		);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// QUIZ COMPLETE
	// ─────────────────────────────────────────────────────────────────────────
	if (status === 'finished' || status === 'completed') {
		const myRank = leaderboard.findIndex(p => p.userId === user?._id) + 1;
		const myScore = leaderboard.find(p => p.userId === user?._id)?.score ?? 0;

		return (
			<Shell>
				<div className="min-h-screen flex items-center justify-center p-6">
					<motion.div
						initial={{ opacity: 0, y: 24 }}
						animate={{ opacity: 1, y: 0 }}
						className="w-full max-w-md space-y-5"
					>
						{/* Hero */}
						<Card className="text-center space-y-4">
							<div className="w-14 h-14 rounded-2xl theme-status-success flex items-center justify-center mx-auto">
								<Trophy size={26} />
							</div>
							<div>
								<h1 className="font-black tracking-tight theme-text-primary">Quiz Complete!</h1>
								<p className="text-sm theme-text-secondary mt-1">You've reached the finish line.</p>
							</div>
							{/* Score / Rank */}
							<div className="grid grid-cols-2 gap-3 pt-2">
								<div className="rounded-xl theme-surface-soft border theme-border p-4 flex flex-col items-center gap-1">
									<Label>Final Score</Label>
									<span className="text-2xl font-black text-[var(--qb-primary)]">{myScore}</span>
								</div>
								<div className="rounded-xl theme-surface-soft border theme-border p-4 flex flex-col items-center gap-1">
									<Label>Your Rank</Label>
									<span className="text-2xl font-black theme-text-primary">#{myRank || '—'}</span>
								</div>
							</div>
						</Card>

						{/* Leaderboard */}
						{leaderboard.length > 0 && (
							<Card className="space-y-3">
								<Label>Top Performers</Label>
								<div className="space-y-2 mt-2">
									{leaderboard.slice(0, 5).map((player, idx) => (
										<div
											key={idx}
											className={cx(
												'flex items-center justify-between rounded-xl border px-3 py-2.5 transition-colors',
												player.userId === user?._id
													? 'border-[var(--qb-primary)] bg-[color-mix(in_srgb,var(--qb-primary)_7%,var(--qb-surface-1))]'
													: 'theme-border theme-surface-soft'
											)}
										>
											<div className="flex items-center gap-2.5">
												<span className="w-6 h-6 rounded-lg bg-[var(--qb-primary)] text-white text-xs font-black flex items-center justify-center">
													{idx + 1}
												</span>
												<span className="text-sm font-semibold theme-text-primary">{player.name}</span>
											</div>
											<span className="text-sm font-black text-[var(--qb-primary)]">{player.score}</span>
										</div>
									))}
								</div>
							</Card>
						)}

						<button
							onClick={() => navigate('/dashboard')}
							className="w-full h-11 rounded-xl bg-[var(--qb-primary)] hover:bg-[var(--qb-primary-strong)] text-white text-sm font-bold transition-colors"
						>
							Back to Dashboard
						</button>
					</motion.div>
				</div>
			</Shell>
		);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// ACTIVE GAMEPLAY
	// ─────────────────────────────────────────────────────────────────────────
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
					{/* Question card */}
					<motion.div
						key={currentQuestion?._id}
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.25 }}
						className="surface-card rounded-2xl overflow-hidden"
					>
						{/* Timer bar */}
						<div className="h-1 theme-surface-soft">
							<motion.div
								key={currentQuestion?._id + '-bar'}
								initial={{ width: '100%' }}
								animate={{ width: '0%' }}
								transition={{ duration: currentQuestion?.timeLimit || 30, ease: 'linear' }}
								className="h-full bg-[var(--qb-primary)]"
							/>
						</div>

						<div className="p-6 space-y-4">
							{/* Q label + result badge */}
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-1.5 text-[var(--qb-primary)] text-xs font-black uppercase tracking-widest">
									<Zap size={13} fill="currentColor" />
									<span>Question {(currentQuestion?.index ?? 0) + 1}</span>
								</div>

								<AnimatePresence>
									{myResult && (
										<motion.div
											initial={{ scale: 0.8, opacity: 0 }}
											animate={{ scale: 1, opacity: 1 }}
											className={cx(
												'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider',
												myResult.isCorrect
													? 'bg-green-50 text-green-700 border border-green-200'
													: 'bg-red-50 text-red-600 border border-red-200'
											)}
										>
											{myResult.isCorrect
												? <><CheckCircle2 size={11} /> +{myResult.score ?? 0}</>
												: <><XCircle size={11} /> 0</>
											}
										</motion.div>
									)}
								</AnimatePresence>
							</div>

							{/* Question text */}
							<h2 className="text-xl md:text-2xl font-black theme-text-primary leading-snug">
								{currentQuestion?.text}
							</h2>
						</div>
					</motion.div>

					{/* Options */}
					<div className="relative">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							{(currentQuestion?.options || []).map((option, idx) => (
								<OptionButton
									key={idx}
									label={option}
									index={idx}
									isSelected={selectedOption === option}
									isCorrect={
										myResult && selectedOption === option
											? myResult.isCorrect
											: myResult && myResult.correctAnswer === option
											? true
											: undefined
									}
									disabled={!!selectedOption}
									onClick={() => handleAnswer(option)}
								/>
							))}
						</div>

						{/* Result overlay - Minimal Menti style */}
						<AnimatePresence>
							{myResult && showFeedback && (
								<motion.div
									initial={{ opacity: 0, scale: 0.8, y: 20 }}
									animate={{ opacity: 1, scale: 1, y: 0 }}
									exit={{ opacity: 0, scale: 0.8, y: -20 }}
									className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
								>
									<div className="surface-card shadow-2xl rounded-2xl p-4 flex flex-col items-center gap-2 border border-[var(--qb-border)]">
										<div className={cx(
											'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner',
											myResult.isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
										)}>
											{myResult.isCorrect ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
										</div>
										<div className="text-center">
											<p className={cx("text-[17px] font-black tracking-tight leading-none", myResult.isCorrect ? "text-green-600" : "text-red-500")}>
												{myResult.isCorrect ? 'Correct' : 'Wrong'}
											</p>
											<p className="text-[11px] font-bold theme-text-muted mt-1 uppercase tracking-widest leading-none">
												{myResult.timeTaken ? `${myResult.timeTaken.toFixed(1)}s` : ''}
											</p>
										</div>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</div>
			</Shell>
		);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// LOBBY (waiting for host to start)
	// ─────────────────────────────────────────────────────────────────────────
	return (
		<Shell>
			<div className="max-w-2xl mx-auto px-5 py-12 md:py-20 space-y-6">
				{/* Header */}
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<span className="px-2.5 py-1 rounded-full bg-[color-mix(in_srgb,var(--qb-primary)_10%,var(--qb-surface-1))] border border-[color-mix(in_srgb,var(--qb-primary)_20%,var(--qb-border))] text-[var(--qb-primary)] text-[10px] font-black uppercase tracking-widest">
							Lobby Active
						</span>
						<span className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
							<span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
							Live Connection
						</span>
					</div>
					<h1 className="text-2xl md:text-3xl font-black theme-text-primary tracking-tight leading-tight">
						{quizTitle || 'Joining Session…'}
					</h1>
					<p className="text-sm theme-text-secondary">
						The host will start the quiz shortly. Stay on this page.
					</p>
				</div>

				{/* Session code + stats */}
				<div className="grid grid-cols-2 gap-3">
					<Card className="space-y-1">
						<Label>Session Code</Label>
						<p className="text-xl font-black tracking-widest text-[var(--qb-primary)]">
							{code?.toUpperCase()}
						</p>
					</Card>
					<Card className="space-y-1">
						<Label>Participants</Label>
						<div className="flex items-center gap-2">
							<Users size={16} className="theme-text-muted" />
							<p className="text-xl font-black theme-text-primary">{participants.length}</p>
						</div>
					</Card>
				</div>

				{/* Status cards */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<Card className="flex items-center gap-4">
						<div className="w-10 h-10 rounded-xl theme-status-info flex items-center justify-center shrink-0">
							<Clock size={18} />
						</div>
						<div>
							<p className="text-sm font-bold theme-text-primary">Waiting for Host</p>
							<p className="text-xs theme-text-muted mt-0.5">Synced with game server</p>
						</div>
					</Card>
					<Card className="flex items-center gap-4">
						<div className="w-10 h-10 rounded-xl theme-status-accent flex items-center justify-center shrink-0">
							<Zap size={18} />
						</div>
						<div>
							<p className="text-sm font-bold theme-text-primary">Real-time Ready</p>
							<p className="text-xs theme-text-muted mt-0.5">You're in the room</p>
						</div>
					</Card>
				</div>

				{/* "You are in" confirmed row */}
				<Card className="flex items-center justify-between">
					<span className="text-sm font-semibold theme-text-secondary">Your spot is confirmed</span>
					<span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-bold">
						<span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
						You're In!
					</span>
				</Card>

				<p className="text-center text-xs theme-text-muted">
					Session Code: <strong className="theme-text-secondary">{code?.toUpperCase()}</strong>
				</p>
			</div>
		</Shell>
	);
};

export default ParticipantSessionPage;
