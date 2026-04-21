import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, AlertCircle, CreditCard, Loader2 } from 'lucide-react';
import { getPaymentStatus, createPaymentOrder, verifyPayment } from '../../billing/services/billing.service';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useQuizStore } from '../../../stores/useQuizStore';
import useRazorpay from '../../../hooks/useRazorpay';
import Card from '../../../components/common/ui/Card';
import Button from '../../../components/common/ui/Button';
import InputField from '../../../components/common/ui/InputField';
import { textStyles } from '../../../styles/commonStyles';

const INR_SYMBOL = '\u20B9';
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

    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const { loadRazorpayScript } = useRazorpay();
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

    useEffect(() => {
        if (roomCode.length !== 6) return;
        const id = window.setTimeout(() => {
            getQuizByCodeCached(roomCode).catch(() => { });
        }, 200);

        return () => window.clearTimeout(id);
    }, [getQuizByCodeCached, roomCode]);

    const helperMessage = useMemo(() => {
        if (!roomCode) return 'Enter a 6-character room code.';
        if (roomCode.length < 6) return `${6 - roomCode.length} characters remaining.`;
        return 'Looks good. Press join to continue.';
    }, [roomCode]);

    const handleJoin = async (e) => {
        e.preventDefault();
        setError('');

        const cleanedCode = sanitizeRoomCode(roomCode);
        if (cleanedCode.length !== 6) {
            setError('Room code must be 6 letters or numbers.');
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

            if (quiz?.isPaid && quiz?.price > 0 && user?.role !== 'host') {
                const status = await getPaymentStatus(quiz._id);
                if (status?.data?.paid) {
                    navigate(`/quiz/${cleanedCode}`);
                } else {
                    setPaymentQuiz(quiz);
                }
            } else {
                navigate(`/quiz/${cleanedCode}`);
            }
        } catch (err) {
            const message = err?.response?.data?.message;
            setError(message || 'Room not found. Please check the code and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!paymentQuiz) return;
        setPaying(true);
        setError('');

        try {
            const sdkLoaded = await loadRazorpayScript();
            if (!sdkLoaded) {
                throw new Error('Payment gateway not loaded. Please refresh and try again.');
            }

            const order = await createPaymentOrder(paymentQuiz._id, paymentQuiz.price);

            if (order?.data?.mock) {
                await verifyPayment(
                    order.data.orderId,
                    `mock_payment_${Date.now()}`,
                    'mock_signature',
                    paymentQuiz._id,
                );
                setQuizByCodeCached(roomCode, paymentQuiz);
                navigate(`/quiz/${sanitizeRoomCode(roomCode)}`);
                return;
            }

            const options = {
                key: order.data.key,
                amount: order.data.amount * 100,
                currency: order.data.currency,
                name: 'Quvolt',
                description: `Payment for: ${paymentQuiz.title}`,
                order_id: order.data.orderId,
                handler: async (response) => {
                    try {
                        await verifyPayment(
                            response.razorpay_order_id,
                            response.razorpay_payment_id,
                            response.razorpay_signature,
                            paymentQuiz._id,
                        );
                        setQuizByCodeCached(roomCode, paymentQuiz);
                        navigate(`/quiz/${sanitizeRoomCode(roomCode)}`);
                    } catch {
                        setError('Payment verification failed. Please contact support.');
                    }
                },
                prefill: {
                    name: user?.name || '',
                    email: user?.email || '',
                },
                theme: { color: '#6366f1' },
            };

            if (window.Razorpay) {
                const rzp = new window.Razorpay(options);
                rzp.open();
            } else {
                setError('Payment gateway not loaded. Please refresh and try again.');
            }
        } catch {
            setError('Failed to initiate payment. Please try again.');
        } finally {
            setPaying(false);
        }
    };

    return (
        <div className="app-page min-h-[82vh] flex items-center justify-center">
            <Card className="ui-section-card w-full max-w-md text-center space-y-8 rounded-4xl relative overflow-hidden">
                <div className="page-header">
                    <h2 className="page-title">Ready to Join?</h2>
                    <p className="page-subtitle">Enter the room code shared by your host</p>
                </div>

                {error && (
                    <div role="alert" aria-live="assertive" className="flex items-center gap-3 px-4 py-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm text-left">
                        <AlertCircle size={18} className="shrink-0" />
                        {error}
                    </div>
                )}

                {paymentQuiz && (
                    <div className="space-y-6 p-8 theme-status-caution rounded-4xl animate-in zoom-in duration-300 shadow-sm">
                        <div className={`${textStyles.overline} flex items-center justify-center gap-2 theme-tone-caution`}>
                            <CreditCard size={20} />
                            <span>Payment Required</span>
                        </div>
                        <p className="text-sm leading-6 text-slate-600">
                            <span className="font-semibold text-slate-900">{paymentQuiz.title}</span> requires a payment of{' '}
                            <span className="font-semibold text-indigo-600">{INR_SYMBOL}{paymentQuiz.price}</span> to join.
                        </p>
                        <Button
                            onClick={handlePayment}
                            disabled={paying}
                            aria-label={paying ? 'Processing payment' : `Pay ${INR_SYMBOL}${paymentQuiz.price} and Join`}
                            className="btn-premium w-full py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            {paying ? <><Loader2 className="animate-spin" size={20} /> Processing...</> : `PAY ${INR_SYMBOL}${paymentQuiz.price} & JOIN`}
                        </Button>
                        <Button
                            onClick={() => setPaymentQuiz(null)}
                            className="text-xs text-slate-500 hover:text-slate-800 transition-colors font-bold"
                        >
                            Cancel
                        </Button>
                    </div>
                )}

                {!paymentQuiz && (
                    <form onSubmit={handleJoin} className="space-y-4">
                        {lastRoomCode && lastRoomCode !== roomCode && (
                            <button
                                type="button"
                                className={`${textStyles.overline} w-full rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-indigo-700 hover:bg-indigo-100`}
                                onClick={() => {
                                    setRoomCode(lastRoomCode);
                                    setError('');
                                }}
                            >
                                Reuse Last Code: {lastRoomCode}
                            </button>
                        )}

                        <div className="relative">
                            <Hash className="absolute left-4 top-4 text-indigo-500" size={24} />
                            <InputField
                                id="room-code-input"
                                type="text"
                                aria-label="Room Code"
                                placeholder="ENTER CODE"
                                className="w-full pl-14 pr-4 py-4 text-center text-xl font-semibold tracking-[0.35em] uppercase bg-gray-50 border border-gray-200 rounded-2xl text-slate-900 placeholder:normal-case placeholder:font-medium placeholder:text-gray-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                                maxLength={6}
                                value={roomCode}
                                onChange={(e) => {
                                    setError('');
                                    setRoomCode(sanitizeRoomCode(e.target.value));
                                }}
                                onPaste={(e) => {
                                    e.preventDefault();
                                    const pasted = e.clipboardData?.getData('text') || '';
                                    setRoomCode(sanitizeRoomCode(pasted));
                                    setError('');
                                }}
                                required
                            />
                        </div>

                        <p className={textStyles.tinyMuted}>{helperMessage}</p>

                        <Button
                            type="submit"
                            id="join-room-btn"
                            disabled={loading || roomCode.length < 6}
                            aria-label={loading ? 'Verifying room code' : 'Join Room'}
                            className="btn-premium flex items-center justify-center gap-3 w-full py-4 text-lg font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? <><Loader2 className="animate-spin" size={24} /> Verifying...</> : 'JOIN ROOM'}
                        </Button>
                    </form>
                )}
            </Card>
        </div>
    );
};

export default QuizJoinRoom;


