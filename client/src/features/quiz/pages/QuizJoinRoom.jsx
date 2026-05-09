import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, AlertCircle, CreditCard, Loader2, Sparkles, User, ArrowRight } from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { guestLogin } from '../../auth/services/auth.service';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useQuizStore } from '../../../stores/useQuizStore';
import usePayment from '../../../hooks/usePayment';
import { paymentApi } from '../../../services/payment.api';
import { textStyles, components, typography, cx } from '../../../styles/index';

const INR_SYMBOL = '₹';
const LAST_ROOM_KEY = 'qb_last_room_code';

const sanitizeRoomCode = (value) => String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);

const QuizJoinRoom = () => {
    const [roomCode, setRoomCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [paymentQuiz, setPaymentQuiz] = useState(null);
    const [paying, setPaying] = useState(false);
    const [lastRoomCode, setLastRoomCode] = useState('');
    const [guestName, setGuestName] = useState('');
    const [showGuestForm, setShowGuestForm] = useState(false);

    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const { purchaseQuiz } = usePayment();
    const getQuizByCodeCached = useQuizStore((state) => state.getQuizByCodeCached);
    const setQuizByCodeCached = useQuizStore((state) => state.setQuizByCodeCached);

    useEffect(() => {
        try {
            const cached = localStorage.getItem(LAST_ROOM_KEY);
            if (cached) setLastRoomCode(sanitizeRoomCode(cached));
        } catch {
            setLastRoomCode('');
        }
    }, []);

    const helperMessage = useMemo(() => {
        if (!roomCode) return '6-Character Security Code Required';
        if (roomCode.length < 6) return `${6 - roomCode.length} Characters Remaining`;
        return 'Authentic Sequence. Ready to Synchronize.';
    }, [roomCode]);

    const handleJoin = async (e) => {
        e.preventDefault();
        setError('');

        const cleanedCode = sanitizeRoomCode(roomCode);
        if (cleanedCode.length !== 6) {
            setError('Sequence mismatch. Enter 6 characters.');
            return;
        }

        setLoading(true);
        try {
            const quiz = await getQuizByCodeCached(cleanedCode);

            try {
                localStorage.setItem(LAST_ROOM_KEY, cleanedCode);
                setLastRoomCode(cleanedCode);
            } catch {
                // Ignore localStorage failure.
            }

            if (!user) {
                setShowGuestForm(true);
                setLoading(false);
                return;
            }

            if (quiz?.isPaid && quiz?.price > 0 && user?.role !== 'host') {
                const { data: status } = await paymentApi.getQuizPaymentStatus(quiz._id);
                if (status?.paid) {
                    navigate(`/quiz/${cleanedCode}`);
                } else {
                    setPaymentQuiz(quiz);
                }
            } else {
                navigate(`/quiz/${cleanedCode}`);
            }
        } catch (err) {
            setError(err?.response?.data?.message || 'Access Denied. Room not found.');
        } finally {
            setLoading(false);
        }
    };

    const handleGuestJoin = async (e) => {
        e.preventDefault();
        if (!guestName.trim()) return;

        setLoading(true);
        try {
            const response = await guestLogin(guestName);
            useAuthStore.getState().setAuthData(response);
            
            const cleanedCode = sanitizeRoomCode(roomCode);
            const quiz = await getQuizByCodeCached(cleanedCode);

            if (quiz?.isPaid && quiz?.price > 0) {
                setPaymentQuiz(quiz);
            } else {
                navigate(`/quiz/${cleanedCode}`);
            }
        } catch (err) {
            setError(err?.response?.data?.message || 'Identity initialization failed');
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!paymentQuiz) return;
        setPaying(true);
        setError('');

        purchaseQuiz(paymentQuiz._id, paymentQuiz.price, () => {
            setQuizByCodeCached(roomCode, paymentQuiz);
            navigate(`/quiz/${sanitizeRoomCode(roomCode)}`);
        }).finally(() => {
            setPaying(false);
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
            <Motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-xl relative"
            >
                {/* Background Blobs */}
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

                <div className={`${components.analytics.card} !p-12 !rounded-[3.5rem] relative overflow-hidden border-2 border-white/50 dark:border-white/5 backdrop-blur-xl shadow-2xl shadow-indigo-500/10`}>
                    <div className="text-center space-y-4 mb-12">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 mb-2">
                            <Sparkles size={12} fill="currentColor" />
                            <span className={typography.eyebrow}>Global Access Portal</span>
                        </div>
                        <h2 className={typography.display}>Synchronize Room</h2>
                        <p className={typography.body}>Establish connection via host-provided sequence</p>
                    </div>

                    <AnimatePresence mode="wait">
                        {error && (
                            <Motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-8 p-5 rounded-[1.5rem] bg-red-500/10 border-2 border-red-500/20 flex items-center gap-4 text-red-500"
                            >
                                <AlertCircle size={20} className="shrink-0" />
                                <p className={typography.eyebrow + " !text-red-500"}>{error}</p>
                            </Motion.div>
                        )}
                    </AnimatePresence>

                    {paymentQuiz ? (
                        <Motion.div 
                            key="payment"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-8 p-10 rounded-[2.5rem] bg-amber-500/[0.03] border-2 border-amber-500/20 text-center"
                        >
                            <div className="w-20 h-20 rounded-3xl bg-amber-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-amber-500/30 mb-6">
                                <CreditCard size={36} />
                            </div>
                            <div className="space-y-2">
                                <h3 className={typography.h2}>Premium Access Required</h3>
                                <p className={typography.body}>
                                    <span className="theme-text-primary font-semibold">{paymentQuiz.title}</span> is a tiered session requiring a contribution of <span className="text-indigo-500 font-bold">{INR_SYMBOL}{paymentQuiz.price}</span>.
                                </p>
                            </div>
                            <button
                                onClick={handlePayment}
                                disabled={paying}
                                className={`${components.button.base} ${components.button.sizes.lg} ${components.button.variants.primary} !rounded-2xl w-full h-16 font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-500/20 disabled:opacity-50`}
                            >
                                {paying ? <Loader2 className="animate-spin" size={24} /> : `Process Payment & Connect`}
                            </button>
                            <button
                                onClick={() => setPaymentQuiz(null)}
                                className="text-[10px] font-black uppercase tracking-[0.25em] theme-text-muted hover:theme-text-primary transition-colors"
                            >
                                Return to Entry
                            </button>
                        </Motion.div>
                    ) : showGuestForm ? (
                        <Motion.form 
                            key="guest"
                            onSubmit={handleGuestJoin}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-8"
                        >
                            <div className="flex items-center gap-5 p-6 rounded-[2rem] bg-indigo-500/5 border-2 border-indigo-500/10">
                                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-white/5 flex items-center justify-center text-indigo-500 shadow-sm">
                                    <User size={28} />
                                </div>
                                <div>
                                    <h3 className={typography.h3}>Anonymous Access</h3>
                                    <p className={typography.small}>Initialize guest identity for this session</p>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <label className={typography.eyebrow + " ml-1"}>Identity Display Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter your alias"
                                    className="w-full h-16 px-6 bg-gray-50 dark:bg-white/5 border-2 theme-border rounded-2xl text-lg font-semibold theme-text-primary focus:border-indigo-500 outline-none transition-all placeholder:font-medium placeholder:opacity-30"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="flex flex-col gap-4">
                                <button
                                    type="submit"
                                    disabled={loading || guestName.trim().length < 2}
                                    className={`${components.button.base} ${components.button.sizes.lg} ${components.button.variants.primary} !rounded-2xl w-full h-16 font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-500/20 disabled:opacity-50`}
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : 'Establish Connection'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowGuestForm(false)}
                                    className={typography.micro + " hover:theme-text-primary transition-colors"}
                                >
                                    Change Room Code
                                </button>
                            </div>
                        </Motion.form>
                    ) : (
                        <Motion.form 
                            key="entry"
                            onSubmit={handleJoin}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-8"
                        >
                            {lastRoomCode && lastRoomCode !== roomCode && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRoomCode(lastRoomCode);
                                        setError('');
                                    }}
                                    className="w-full p-4 rounded-2xl bg-indigo-500/5 border-2 border-dashed border-indigo-500/20 text-indigo-500 "
                                >
                                    <span className={typography.eyebrow + " !text-indigo-500"}>Restore Sequence: {lastRoomCode}</span>
                                </button>
                            )}

                            <div className="space-y-4">
                                <div className="relative group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-500 group-focus-within:scale-110 transition-transform">
                                        <Hash size={28} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="ROOM CODE"
                                        className="w-full h-24 pl-20 pr-8 text-center text-4xl font-semibold tracking-[0.4em] uppercase bg-gray-50 dark:bg-white/5 border-2 theme-border rounded-[2rem] theme-text-primary placeholder:text-gray-300 dark:placeholder:text-gray-700 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-800 transition-all"
                                        maxLength={6}
                                        value={roomCode}
                                        onChange={(e) => {
                                            setError('');
                                            setRoomCode(sanitizeRoomCode(e.target.value));
                                        }}
                                        required
                                    />
                                </div>
                                <p className={"text-center " + typography.micro + " opacity-40"}>{helperMessage}</p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || roomCode.length < 6}
                                className={`${components.button.base} ${components.button.sizes.lg} ${components.button.variants.primary} !rounded-2xl w-full h-20 font-black uppercase tracking-[0.3em] text-sm shadow-xl shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed group`}
                            >
                                {loading ? <><Loader2 className="animate-spin mr-2" /> Syncing...</> : <>
                                    Join Session
                                    <ArrowRight size={20} className="ml-3 group-hover:translate-x-2 transition-transform" />
                                </>}
                            </button>
                        </Motion.form>
                    )}
                </div>

                <div className="mt-12 text-center">
                    <p className={typography.micro + " opacity-40"}>
                        Secure Environment • Real-time Data Ingestion Active
                    </p>
                </div>
            </Motion.div>
        </div>
    );
};

export default QuizJoinRoom;
