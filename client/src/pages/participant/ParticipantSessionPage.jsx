import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Clock, Zap, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { useSocketStore } from '../../stores/useSocketStore';
import { useQuizStore } from '../../stores/useQuizStore';
import { useAuthStore } from '../../stores/useAuthStore';
import OptionButton from '../../components/common/OptionButton';
import { buttonStyles } from '../../styles/buttonStyles';
import { cx } from '../../styles/theme';

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
		resetRealtimeState
	} = useQuizStore();

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	// Initial Data Fetch & Socket Connection
	useEffect(() => {
		let isMounted = true;

		const initSession = async () => {
			if (!code) return;

			try {
				setLoading(true);
				setError(null);

				// 1. Fetch Quiz Metadata (cached)
				const quizData = await getQuizByCodeCached(code.toUpperCase());
				if (!isMounted) return;

				// Sync title to store for UI visibility
				useQuizStore.getState().setQuizTitle(quizData?.title || '');
				useQuizStore.getState().setActiveQuiz(quizData);

				// 2. Connect Socket if not connected
				if (!socket || !connected) {
					connectSocket();
				}

				// 3. Join the specific room
				joinRoom(code.toUpperCase());

			} catch (err) {
				if (isMounted) {
					setError(err?.response?.data?.message || 'Failed to join this session. Please check the code.');
				}
			} finally {
				if (isMounted) setLoading(false);
			}
		};

		initSession();

		return () => {
			isMounted = false;
		};
	}, [code, connectSocket, joinRoom, socket, connected, getQuizByCodeCached]);

	// Cleanup on unmount
	useEffect(() => {
		return () => resetRealtimeState();
	}, [resetRealtimeState]);

	// Handle View Transition (When host starts)
	useEffect(() => {
		if (status === 'playing' || status === 'live' || currentQuestion) {
			// Logic to switch to Active Quiz View if integrated, 
			// for now we stay in lobby or handle sub-views.
		}
	}, [status, currentQuestion]);

	// REDIRECT IF ABORTED
	useEffect(() => {
		if (abortMessage) {
			navigate('/join', { state: { error: abortMessage } });
		}
	}, [abortMessage, navigate]);

	// AUTO-TRANSITION TO LIVE VIEW
	useEffect(() => {
		// Map 'live' status from socket to 'live' view in the app
		if (status === 'live' || status === 'playing') {
			if (view !== 'live') setView('live');
		}
	}, [status, view, setView]);

	if (loading) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center bg-[var(--qb-surface-0)] theme-text-primary p-6">
				<motion.div
					initial={{ scale: 0.9, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					className="flex flex-col items-center gap-6"
				>
					<div className="relative">
						<div className="absolute inset-0 blur-xl bg-primary-500/20 rounded-full animate-pulse" />
						<Loader2 className="w-12 h-12 text-[var(--qb-primary)] animate-spin relative" />
					</div>
					<div className="text-center space-y-2">
						<h2 className="text-2xl font-bold tracking-tight">Syncing Session</h2>
						<p className="text-slate-500 font-medium">Entering the lobby for {code?.toUpperCase()}...</p>
					</div>
				</motion.div>
			</div>
		);
	}

	if (error || errorMessage) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-[var(--qb-surface-0)] p-6">
				<motion.div
					initial={{ y: 20, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					className="w-full max-w-md p-8 rounded-3xl bg-white border theme-border shadow-xl text-center space-y-6 shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900"
				>
					<div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
						<AlertCircle size={32} />
					</div>
					<div className="space-y-2">
						<h2 className="text-2xl font-bold theme-text-primary">Ops! Something went wrong</h2>
						<p className="text-slate-500 font-medium font-bold text-red-500">{error || errorMessage}</p>
					</div>
					<button
						onClick={() => navigate('/join')}
						className="w-full h-14 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-lg transition-transform hover:scale-[1.02] active:scale-95 shadow-lg"
					>
						Back to Join
					</button>
				</motion.div>
			</div>
		);
	}

	// QUIZ COMPLETE VIEW
	if (status === 'finished' || status === 'completed') {
		const myRank = leaderboard.findIndex(p => p.userId === user?._id) + 1;
		const myScore = leaderboard.find(p => p.userId === user?._id)?.score || 0;

		return (
			<div className="min-h-screen bg-[var(--qb-surface-0)] theme-text-primary p-6 flex flex-col items-center justify-center">
				<motion.div
					initial={{ scale: 0.9, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					className="w-full max-w-2xl bg-white border p-8 md:p-12 rounded-[2.5rem] border-2 border-slate-900 shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] space-y-8 relative overflow-hidden text-center"
				>
					{/* Decorative background circle */}
					<div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-10 translate-x-12 -translate-y-12" />

					<div className="space-y-4">
						<div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
							<ShieldCheck size={40} />
						</div>
						<h1 className="text-4xl md:text-5xl font-black theme-text-primary tracking-tight">Quiz Complete!</h1>
						<p className="text-xl theme-text-secondary font-bold">You've reached the finish line. Great job!</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
						<div className="p-6 rounded-3xl bg-slate-50 border theme-border flex flex-col items-center gap-2">
							<span className="text-[10px] font-black theme-text-muted uppercase tracking-[0.2em]">YOUR FINAL SCORE</span>
							<span className="text-4xl font-black text-[var(--qb-primary)]">{myScore}</span>
						</div>
						<div className="p-6 rounded-3xl bg-slate-50 border theme-border flex flex-col items-center gap-2">
							<span className="text-[10px] font-black theme-text-muted uppercase tracking-[0.2em]">YOUR RANK</span>
							<span className="text-4xl font-black text-slate-900">#{myRank || '—'}</span>
						</div>
					</div>

					<div className="space-y-4 pt-6">
						<h3 className="text-left text-[11px] font-black theme-text-muted uppercase tracking-widest pl-2">Top Performers</h3>
						<div className="space-y-2">
							{leaderboard.slice(0, 3).map((player, idx) => (
								<div key={idx} className={cx(
									"flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
									player.userId === user?._id ? "border-slate-900 bg-slate-50" : "border-slate-100 bg-white"
								)}>
									<div className="flex items-center gap-3">
										<span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">
											{idx + 1}
										</span>
										<span className="font-bold theme-text-primary">{player.name}</span>
									</div>
									<span className="font-black text-[var(--qb-primary)]">{player.score} pts</span>
								</div>
							))}
						</div>
					</div>

					<button
						onClick={() => navigate('/dashboard')}
						className="w-full h-14 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-lg transition-transform hover:scale-[1.02] active:scale-95 shadow-lg"
					>
						Back to Dashboard
					</button>
				</motion.div>
			</div>
		);
	}

	// ACTIVE GAMEPLAY VIEW
	if (status === 'playing' || status === 'live' || currentQuestion) {
		return (
			<div className="min-h-screen bg-[var(--qb-surface-0)] theme-text-primary pb-24 overflow-x-hidden">
				{/* Fixed Header */}
				<div className="fixed top-0 left-0 w-full z-30 bg-[var(--qb-surface-0)] border-b theme-border px-6 py-4 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="px-3 py-1 rounded-lg bg-primary-50 text-[var(--qb-primary)] text-[10px] font-black uppercase tracking-widest border border-primary-100">
							LIVE SESSION
						</div>
						<h2 className="font-black theme-text-primary text-sm tracking-tight truncate max-w-[200px]">
							{quizTitle}
						</h2>
					</div>

					<div className="flex items-center gap-4">
						<div className="flex flex-col items-end">
							<span className="text-[10px] font-black theme-text-muted uppercase tracking-widest">PROGRESS</span>
							<span className="font-black theme-text-primary tabular-nums">
								{currentQuestion?.index + 1} / {currentQuestion?.total}
							</span>
						</div>
					</div>
				</div>

				<div className="max-w-4xl mx-auto px-6 pt-24 space-y-8">
					{/* Question Card */}
					<motion.div
						key={currentQuestion?._id}
						initial={{ scale: 0.95, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						className="p-8 md:p-12 rounded-[2.5rem] bg-white border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] relative overflow-hidden"
					>
						<div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
							<motion.div
								initial={{ width: '100%' }}
								animate={{ width: '0%' }}
								transition={{ duration: currentQuestion?.timeLimit || 10, ease: 'linear' }}
								className="h-full bg-[var(--qb-primary)]"
							/>
						</div>

						<div className="space-y-4 pt-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2 text-indigo-500 font-black text-xs uppercase tracking-widest">
									<Zap size={14} fill="currentColor" />
									<span>Question {currentQuestion?.index + 1}</span>
								</div>

								{/* Result Badge */}
								<AnimatePresence>
									{myResult && (
										<motion.div
											initial={{ x: 20, opacity: 0 }}
											animate={{ x: 0, opacity: 1 }}
											className={cx(
												"px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
												myResult.isCorrect ? "bg-green-100 text-green-600 border border-green-200" : "bg-red-100 text-red-600 border border-red-200"
											)}
										>
											{myResult.isCorrect ? (
												<><ShieldCheck size={12} /> CORRECT</>
											) : (
												<><AlertCircle size={12} /> WRONG</>
											)}
										</motion.div>
									)}
								</AnimatePresence>
							</div>
							<h1 className="text-2xl md:text-4xl font-black theme-text-primary leading-tight">
								{currentQuestion?.text}
							</h1>
						</div>
					</motion.div>

					{/* Options Grid */}
					<div className="relative">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{(currentQuestion?.options || []).map((option, idx) => (
								<OptionButton
									key={idx}
									label={option}
									index={idx}
									isSelected={selectedOption === option}
									isCorrect={
										myResult && selectedOption === option 
											? (myResult.isCorrect) 
											: (myResult && myResult.correctAnswer === option ? true : undefined)
									}
									disabled={!!selectedOption}
									onClick={() => {
										if (selectedOption) return; // Prevent double submission
										setSelectedOption(option);

										// Handle answer submission via socket
										socket?.emit('submit_answer', {
											roomCode: code?.toUpperCase(),
											questionId: currentQuestion?._id,
											selectedOption: option
										});
									}}
								/>
							))}
						</div>

						{/* RESULT OVERLAY */}
						<AnimatePresence>
							{myResult && (
								<motion.div
									initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
									animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
									exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
									className="absolute inset-0 z-20 flex items-center justify-center rounded-[2.5rem] bg-white/40"
								>
									<motion.div
										initial={{ scale: 0.5, opacity: 0, y: 20 }}
										animate={{ scale: 1, opacity: 1, y: 0 }}
										className={cx(
											"p-8 md:p-12 rounded-[2rem] border-4 shadow-2xl flex flex-col items-center gap-6 text-center max-w-[90%]",
											myResult.isCorrect 
												? "bg-white border-green-500 text-green-600 shadow-green-200" 
												: "bg-white border-red-500 text-red-600 shadow-red-200"
										)}
									>
										<div className={cx(
											"w-24 h-24 rounded-full flex items-center justify-center mb-2",
											myResult.isCorrect ? "bg-green-100" : "bg-red-100"
										)}>
											{myResult.isCorrect ? (
												<ShieldCheck size={64} className="fill-green-100" />
											) : (
												<AlertCircle size={64} className="fill-red-100" />
											)}
										</div>
										
										<div className="space-y-2">
											<h2 className="text-4xl font-black uppercase tracking-tighter">
												{myResult.isCorrect ? "Brilliant!" : "Not Quite!"}
											</h2>
											<p className="text-lg font-bold opacity-80">
												{myResult.isCorrect 
													? `You earned +${myResult.score} points!` 
													: "Sometimes we win, sometimes we learn."}
											</p>
										</div>

										{!myResult.isCorrect && myResult.correctAnswer && (
											<div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 w-full text-slate-600">
												<span className="text-[10px] font-black uppercase tracking-widest block mb-1">Correct Answer</span>
												<span className="text-xl font-black tracking-tight">{myResult.correctAnswer}</span>
											</div>
										)}

										<div className="flex items-center gap-6 mt-4">
											<div className="flex flex-col items-center">
												<span className="text-[10px] font-black opacity-40 uppercase tracking-widest">STREAK</span>
												<span className="text-2xl font-black">{myResult.streak || 0} 🔥</span>
											</div>
											<div className="w-px h-8 bg-current opacity-20" />
											<div className="flex flex-col items-center">
												<span className="text-[10px] font-black opacity-40 uppercase tracking-widest">TOTAL</span>
												<span className="text-2xl font-black">{myResult.totalScore || 0}</span>
											</div>
										</div>
									</motion.div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					<div className="text-center pt-12">
						<p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
							Session Code: {code?.toUpperCase()}
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[var(--qb-surface-0)] theme-text-primary pb-24 overflow-x-hidden">

			{/* Background Accents */}
			<div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
				<div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary-500/5 blur-[120px] rounded-full" />
				<div className="absolute bottom-0 right-0 w-[30%] h-[30%] bg-indigo-500/5 blur-[100px] rounded-full" />
			</div>

			<div className="max-w-4xl mx-auto px-6 pt-12 md:pt-20 space-y-10">
				{/* Header Section */}
				<div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b theme-border">
					<motion.div
						initial={{ x: -20, opacity: 0 }}
						animate={{ x: 0, opacity: 1 }}
						className="space-y-3"
					>
						<div className="flex items-center gap-3">
							<span className="px-3 py-1 rounded-full bg-primary-50 text-[var(--qb-primary)] text-[10px] font-black uppercase tracking-widest border border-primary-100">
								LOBBY ACTIVE
							</span>
							<div className="flex items-center gap-1.5 text-xs font-bold text-green-500">
								<div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
								LIVE CONNECTION
							</div>
						</div>
						<h1 className="text-3xl md:text-5xl font-black theme-text-primary tracking-tight">
							{quizTitle || 'Joining Session...'}
						</h1>
						<p className="theme-text-secondary font-semibold text-lg max-w-lg">
							Hang tight! The host will start the quiz shortly.
						</p>
					</motion.div>

					<motion.div
						initial={{ x: 20, opacity: 0 }}
						animate={{ x: 0, opacity: 1 }}
						className="flex flex-col items-end gap-1.5"
					>
						<span className="text-[10px] font-black theme-text-muted uppercase tracking-[0.2em]">SESSION CODE</span>
						<div className="px-6 py-3 rounded-2xl bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] text-2xl font-black tracking-widest theme-text-primary">
							{code?.toUpperCase()}
						</div>
					</motion.div>
				</div>

				{/* Main Content Grid */}
				<div className="grid grid-cols-1 md:grid-cols-12 gap-6">
					{/* Left: Stats/Info */}
					<div className="md:col-span-8 space-y-6">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<motion.div
								initial={{ y: 20, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								transition={{ delay: 0.1 }}
								className="p-6 rounded-3xl bg-white border theme-border shadow-sm space-y-4"
							>
								<div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
									<Clock size={24} />
								</div>
								<div className="space-y-1">
									<h3 className="font-bold theme-text-primary text-sm uppercase tracking-wider">Waiting for Host</h3>
									<p className="text-[11px] theme-text-muted font-bold">Synced with Game Server</p>
								</div>
							</motion.div>

							<motion.div
								initial={{ y: 20, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								transition={{ delay: 0.2 }}
								className="p-6 rounded-3xl bg-white border theme-border shadow-sm space-y-4"
							>
								<div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
									<Zap size={24} />
								</div>
								<div className="space-y-1">
									<h3 className="font-bold theme-text-primary text-sm uppercase tracking-wider">Interactive Flow</h3>
									<p className="text-[11px] theme-text-muted font-bold">Real-time participation ready</p>
								</div>
							</motion.div>
						</div>

						{/* Connected Users Reel */}
						<motion.div
							initial={{ y: 20, opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
							transition={{ delay: 0.3 }}
							className="p-8 rounded-3xl theme-surface-soft border theme-border flex items-center justify-between"
						>
							<div className="flex items-center gap-3">
								<Users className="text-[var(--qb-primary)]" size={20} />
								<h3 className="font-bold text-lg theme-text-primary">Lobby Connected</h3>
							</div>
							<div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border theme-border shadow-sm">
								<div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
								<span className="text-xs font-black theme-text-primary uppercase tracking-widest">You are in!</span>
							</div>
						</motion.div>
					</div>

					{/* Right: User Status */}
					<div className="md:col-span-4 space-y-4">
						<p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest px-4">
							You will automatically be launched into the quiz when the host starts.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ParticipantSessionPage;
