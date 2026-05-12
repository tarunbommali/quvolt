import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { Zap, Clock, Copy, Settings2, ShieldCheck, Share2, Users, ArrowRight, X } from 'lucide-react';
import { startLiveSession, abortSession, getSessionState } from '../services/host.service';
import Toast from '../../../components/common/Toast';
import useToast from '../../../hooks/useToast';
import LoadingScreen from '../../../components/common/LoadingScreen';
import PageHeader from '../../../components/layout/PageHeader';
import { LivePulseBadge } from '../../../components/common/ui';
import { useQuizStore } from '../../../stores/useQuizStore';
import { useSocketStore } from '../../../stores/useSocketStore';
import { resolveSessionRoute } from '../../../utils/sessionRouteResolver';
import { typography, layout, buttonStyles, cards, cx } from '../../../styles/index';

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

    const connectSocket = useSocketStore((s) => s.connectSocket);
    const socket = useSocketStore((s) => s.socket);
    const connected = useSocketStore((s) => s.connected);
    const joinRoom = useSocketStore((s) => s.joinRoom);
    const startQuizSocketBroadcast = useSocketStore((s) => s.startQuizBroadcast);

    const getQuizzesForParent = useQuizStore((s) => s.getQuizzesForParent);
    const activeQuiz = useQuizStore((s) => s.activeQuiz);
    const sessionCode = useQuizStore((s) => s.sessionCode);
    const participants = useQuizStore((s) => s.participants);
    const setActiveQuiz = useQuizStore((s) => s.setActiveQuiz);
    const setSessionCode = useQuizStore((s) => s.setSessionCode);
    const setStatus = useQuizStore((s) => s.setStatus);
    const resetRealtimeState = useQuizStore((s) => s.resetRealtimeState);

    const { toast, showToast, clearToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [copiedCode, setCopiedCode] = useState(false);
    const [now, setNow] = useState(Date.now());

    const scheduledAt = activeQuiz?.scheduledAt;
    const isScheduled = !!scheduledAt;
    const scheduledDate = useMemo(() => (scheduledAt ? new Date(scheduledAt) : null), [scheduledAt]);
    const displayedCode = sessionCode || activeQuiz?.activeSessionCode || activeQuiz?.sessionCode || activeQuiz?.roomCode;

    const joinUrl = `${window.location.origin}/join/${displayedCode}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}&bgcolor=ffffff&color=4f46e5&margin=0`;

    const countdown = useMemo(() => {
        if (!isScheduled || !scheduledDate) return 0;
        return scheduledDate.getTime() - now;
    }, [isScheduled, scheduledDate, now]);

    const canLaunch = !isScheduled || countdown <= 0;

    useEffect(() => {
        return () => resetRealtimeState();
    }, [resetRealtimeState]);

    useEffect(() => {
        if (location.state?.quiz) setActiveQuiz(location.state.quiz);
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
                const nextCode = quiz.sessionCode || quiz.activeSessionCode || quiz.roomCode;
                const normalizedStatus = String(quiz.status || '').toLowerCase();
                const nextStatus = nextCode && !['live', 'finished', 'completed', 'aborted'].includes(normalizedStatus) ? 'waiting' : (normalizedStatus || 'waiting');
                if (String(quiz.status) !== nextStatus || (!quiz.sessionCode && nextCode)) {
                    setActiveQuiz({ ...quiz, status: nextStatus, ...(nextCode ? { sessionCode: nextCode } : {}) });
                }
                if (nextCode && sessionCode !== nextCode) setSessionCode(nextCode);
                setStatus(nextStatus);
                setLoading(false);
            } catch (error) {
                if (!active) return;
                showToast(`Error: ${error?.message}`);
                navigate('/workspace');
            }
        };
        initInviteRoom();
        return () => { active = false; };
    }, [activeQuiz?._id, getQuizzesForParent, id, navigate, setActiveQuiz, setSessionCode, setStatus, showToast]);

    const status = useQuizStore((state) => state.status);

    useEffect(() => {
        if (!activeQuiz) return;
        const code = sessionCode || activeQuiz.activeSessionCode || activeQuiz.sessionCode || activeQuiz.roomCode;
        if (!code) return;
        if (!socket || !connected) connectSocket();
        joinRoom(code.toUpperCase(), activeQuiz.sessionId);
        const handleSessionStart = (data) => {
            if (activeQuiz && (data.roomCode === code.toUpperCase() || data.status === 'live')) setStatus('live');
        };
        socket?.on('session:start', handleSessionStart);
        
        const handleUserLeft = (data) => {
            if (data.reason && data.reason !== 'left') {
                showToast(`${data.name} was removed: ${data.reason}`, 'info');
            }
        };
        socket?.on('user_left', handleUserLeft);

        return () => { 
            socket?.off('session:start', handleSessionStart); 
            socket?.off('user_left', handleUserLeft);
        };
    }, [activeQuiz?._id, sessionCode, joinRoom, socket, connected, connectSocket, setStatus, showToast]);

    useEffect(() => {
        if (status === 'live' && activeQuiz?._id) {
            navigate(resolveSessionRoute(activeQuiz), { replace: true, state: { quiz: { ...activeQuiz, status: 'live' } } });
        }
    }, [status, activeQuiz, navigate]);

    useEffect(() => {
        if (!isScheduled || !scheduledDate) return;
        const tid = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(tid);
    }, [isScheduled, scheduledDate]);

    useEffect(() => {
        const code = sessionCode || activeQuiz?.activeSessionCode || activeQuiz?.roomCode;
        if (!code) return;
        const tid = setInterval(async () => {
            try {
                const response = await getSessionState(code.toUpperCase());
                if (response.success && response.data.participants) useQuizStore.getState().setParticipants(response.data.participants);
            } catch { /* suppress heartbeat logs */ }
        }, 5000);
        return () => clearInterval(tid);
    }, [activeQuiz?._id, sessionCode]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(joinUrl);
        showToast('Link copied!', 'success');
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
            showToast(error?.response?.data?.message || 'Failed to launch live session');
        }
    };

    const handleAbort = async () => {
        try {
            if (activeQuiz) {
                await abortSession(activeQuiz._id, sessionCode);
                setActiveQuiz({ ...activeQuiz, status: 'aborted' });
                setSessionCode(null);
                setStatus('aborted');
            }
        } catch { /* best effort */ }
        finally { navigate('/workspace'); }
    };

    if (loading || !activeQuiz) return <LoadingScreen />;

    return (
        <div className={cx(layout.page, 'min-h-screen')}>
            <AnimatePresence>
                {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
            </AnimatePresence>

            <PageHeader
                breadcrumbs={[{ label: 'Workspace', href: '/workspace' }, { label: 'Invite' }]}
                actions={(
                    <button 
                        onClick={handleAbort} 
                        className={cx(buttonStyles.base, buttonStyles.danger, buttonStyles.sizeMd, 'gap-2 shadow-lg shadow-red-500/20')}
                    >
                        <X size={14} />
                        <span>Abort Session</span>
                    </button>
                )}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 space-y-6">
                    {isScheduled && scheduledDate && !canLaunch && (
                        <Motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className={cx(cards.base, "!bg-indigo-500 !text-white flex items-center justify-between !p-8 !rounded-[2.5rem] shadow-xl shadow-indigo-500/20")}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                                    <Clock size={24} />
                                </div>
                                <div className="space-y-0.5">
                                    <p className={cx(typography.micro, "!text-white/60")}>Scheduled Start</p>
                                    <p className={typography.h2}>{scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>
                            <div className="text-right space-y-0.5">
                                <p className={cx(typography.micro, "!text-white/60")}>Commencing In</p>
                                <p className={typography.metricLg}>{formatCountdown(countdown)}</p>
                            </div>
                        </Motion.div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={cx(cards.base, "!p-8 !rounded-[2.5rem] space-y-6 border theme-border")}>
                            <div className="space-y-1">
                                <p className={typography.eyebrow}>Room Access Code</p>
                                <h2 className={cx(typography.metricLg, "text-indigo-500 tracking-[0.3em] uppercase")}>{displayedCode}</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                <LivePulseBadge count={participants.length} label="Users Waiting" />
                                <button onClick={handleCopyCode} className="ml-auto w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center theme-text-primary hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                    <Copy size={18} />
                                </button>
                            </div>
                        </div>

                        <div className={cx(cards.base, "!p-8 !rounded-[2.5rem] space-y-6 border theme-border")}>
                            <div className="space-y-1">
                                <p className={typography.eyebrow}>Direct Join URL</p>
                                <p className={cx(typography.bodyStrong, "truncate opacity-80")}>{joinUrl}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={cx(typography.micro, "px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/5 border theme-border")}>
                                    Click to share link
                                </div>
                                <button onClick={handleCopyLink} className="ml-auto w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center theme-text-primary hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                    <Share2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className={cx(cards.base, "!p-10 !rounded-[3rem] border-2 border-indigo-500/20 bg-white dark:bg-gray-900 relative overflow-hidden shadow-2xl shadow-indigo-500/5")}>
                         <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                         
                         <div className="relative flex flex-col md:flex-row items-center gap-10">
                            <div className="p-4 bg-white rounded-3xl shadow-xl shadow-indigo-500/10 border theme-border">
                                <img src={qrUrl} alt="Join QR" className="w-48 h-48 md:w-56 md:h-56" />
                            </div>
                            <div className="flex-1 space-y-6 text-center md:text-left">
                                <div className="space-y-2">
                                    <h3 className={typography.metricMd}>Go Live</h3>
                                    <p className={typography.body}>Everything looks ready. Once you launch, participants will be able to see the first slide.</p>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <button
                                        onClick={startQuizBroadcast}
                                        disabled={isScheduled && !canLaunch}
                                        className={cx(buttonStyles.base, buttonStyles.primary, buttonStyles.sizeLg, "!rounded-full px-10 gap-3 shadow-2xl shadow-indigo-500/30 w-full sm:w-auto")}
                                    >
                                        <Zap size={20} fill="currentColor" />
                                        <span>Launch Session</span>
                                        <ArrowRight size={20} />
                                    </button>
                                    <button 
                                        onClick={() => navigate(`/quiz/templates/${id}/settings`)}
                                        className="p-4 rounded-full border theme-border theme-text-primary hover:bg-gray-100 dark:hover:bg-white/5 transition-all shadow-sm"
                                    >
                                        <Settings2 size={24} />
                                    </button>
                                </div>
                            </div>
                         </div>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-6 h-full">
                    <div className={cx(cards.base, "!p-8 !rounded-[2.5rem] border theme-border h-full min-h-[600px] flex flex-col shadow-xl shadow-indigo-500/5")}>
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <Users size={20} className="text-indigo-500" />
                                <h3 className={typography.h3}>Lobby</h3>
                            </div>
                            <span className={cx(typography.smallMd, "px-3 py-1 rounded-full bg-indigo-500 text-white")}>
                                {participants.length}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            <AnimatePresence mode="popLayout">
                                {participants.length === 0 ? (
                                    <Motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex flex-col items-center justify-center py-20 text-center space-y-4"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-slate-300">
                                            <Users size={32} />
                                        </div>
                                        <p className={typography.micro}>Waiting for users...</p>
                                    </Motion.div>
                                ) : (
                                    participants.map((p, i) => (
                                        <Motion.div
                                            key={p._id || i}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent hover:border-indigo-500/20 transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-semibold uppercase">
                                                {p.name.charAt(0)}
                                            </div>
                                            <span className={typography.bodyStrong}>{p.name}</span>
                                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                        </Motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="mt-8 pt-6 border-t theme-border">
                            <div className="flex items-center gap-3 text-emerald-500">
                                <ShieldCheck size={18} />
                                <span className={typography.micro}>Secure Connection Active</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InviteRoom;
