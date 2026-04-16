import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { scheduleQuiz, startQuizSession as apiStartQuizSession } from '../../services/api';
import Toast from '../../components/common/Toast';
import useToast from '../../hooks/useToast';
import LiveLoading from '../../components/organizerLive/LiveLoading';
import LaunchChooser from '../../components/organizerLive/LaunchChooser';
import { useQuizStore } from '../../stores/useQuizStore';
import { resolveSessionRoute } from '../../utils/sessionRouteResolver';

const getQuizStatus = (quiz) => String(quiz?.status || '').toLowerCase();

const OrganizerLivePage = () => {
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

		const status = getQuizStatus(activeQuiz);

		if (status === 'live') {
			navigate(`/live/${activeQuiz._id}`, { replace: true, state: { quiz: activeQuiz, forceLaunch: true } });
			return;
		}

		if (status === 'waiting' || status === 'scheduled') {
			const nextQuiz = { ...activeQuiz, _id: activeQuiz._id, status, sessionCode: activeQuiz.sessionCode || activeQuiz.activeSessionCode || activeQuiz.roomCode };
			navigate(resolveSessionRoute(nextQuiz), { replace: true, state: { quiz: nextQuiz, forceLaunch: true } });
			return;
		}

		try {
			const freshQuiz = await apiStartQuizSession(activeQuiz._id);
			const liveCode = freshQuiz.sessionCode || freshQuiz.roomCode;
			// Ensure _id and status are present for resolveSessionRoute
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
		}
	};

	const handleSchedule = async (scheduledAt) => {
		if (!activeQuiz) return;
		try {
			const updated = await scheduleQuiz(activeQuiz._id, scheduledAt);
			const nextQuiz = { ...updated, status: updated.status || 'scheduled' };
			setActiveQuiz(nextQuiz);
			setStatus('scheduled');
			navigate(resolveSessionRoute(nextQuiz), { replace: true, state: { quiz: nextQuiz } });
			showToast('Quiz scheduled! Permanent link is ready.', 'success');
		} catch (error) {
			showToast(error?.response?.data?.message || 'Failed to schedule quiz');
		}
	};

	if (loading) return <LiveLoading />;

	return (
		<>
			<AnimatePresence>
				{toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
			</AnimatePresence>
			<LaunchChooser
				activeQuiz={activeQuiz}
				navigate={navigate}
				onGoLiveNow={handleGoLiveNow}
				onSchedule={handleSchedule}
				showToast={showToast}
			/>
		</>
	);
	}

	export default OrganizerLivePage;

