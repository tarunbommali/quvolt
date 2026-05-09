import React, { useEffect, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../../stores/useAuthStore';
import {
    cancelSubscription,
    createSubscriptionOrder,
    getSubscriptionPlans,
    verifySubscriptionPayment,
} from '../services/billing.service';
import useRazorpay from '../../../hooks/useRazorpay';
import useToast from '../../../hooks/useToast';
import Toast from '../../../components/common/Toast';
import LoadingScreen from '../../../components/common/LoadingScreen';
import BreadCrumbs from '../../../components/layout/BreadCrumbs';
import CurrentPlanCard from '../components/CurrentPlanCard';
import PlanGrid from '../components/PlanGrid';
import PaymentModal from '../components/PaymentModal';
import { layout, typography, cx } from '../../../styles/index';
import { Sparkles } from 'lucide-react';
import { getMyQuizzes } from '../../quiz/services/quiz.service';

const INITIAL_PAYMENT_MODAL = {
    isOpen: false,
    status: 'pending',
    planName: '',
    amount: 0,
    error: null,
    currentPlanId: null,
};

const BillingOverviewPage = () => {
    const { user, fetchSubscription } = useAuthStore();
    const { loadRazorpayScript } = useRazorpay();
    const { toast, showToast, clearToast } = useToast();

    const [plans, setPlans] = useState([]);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [actionLoading, setActionLoading] = useState({});
    const [usage, setUsage] = useState({ quizCreated: 0 });
    const [paymentModal, setPaymentModal] = useState(INITIAL_PAYMENT_MODAL);
    const [pendingPayment, setPendingPayment] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [planRes, quizRes] = await Promise.allSettled([
                    getSubscriptionPlans(),
                    getMyQuizzes(),
                ]);

                if (planRes.status === 'fulfilled' && planRes.value?.success) {
                    setPlans(planRes.value.data);
                }

                if (quizRes.status === 'fulfilled' && Array.isArray(quizRes.value)) {
                    setUsage({ quizCreated: quizRes.value.length });
                }
            } catch {
                showToast('Failed to load billing details.');
            } finally {
                setLoadingPlans(false);
            }
        };
        load();
    }, [showToast]);

    const closePaymentModal = () => {
        setPaymentModal((prev) => ({ ...prev, isOpen: false }));
        setPendingPayment(null);
    };

    const handleUpgrade = async (planId) => {
        setActionLoading({ [planId]: true });
        try {
            const plan = plans.find((p) => p.id === planId);
            if (!plan) throw new Error('Plan not found');

            setPaymentModal({
                isOpen: true,
                status: 'pending',
                planName: plan.name,
                amount: plan.monthlyAmount / 100,
                error: null,
                currentPlanId: planId,
            });
            setPendingPayment({ planId, plan });

            const isLoaded = await loadRazorpayScript();
            if (!isLoaded) {
                setPaymentModal((prev) => ({ ...prev, status: 'error', error: { message: 'Failed to load payment SDK.' } }));
                return;
            }

            setPaymentModal((prev) => ({ ...prev, status: 'processing' }));
            const orderRes = await createSubscriptionOrder(planId);
            if (!orderRes.success) throw orderRes.error;

            if (planId === 'FREE') {
                await fetchSubscription();
                setPaymentModal((prev) => ({ ...prev, status: 'success' }));
                window.setTimeout(() => closePaymentModal(), 1500);
                setActionLoading({});
                return;
            }

            const { orderId, amount, currency, key } = orderRes.data;

            const options = {
                key,
                amount: amount * 100,
                currency,
                name: 'Quvolt',
                description: `Upgrade to ${planId}`,
                order_id: orderId,
                handler: async (response) => {
                    try {
                        const verified = await verifySubscriptionPayment(
                            orderId,
                            response.razorpay_payment_id,
                            response.razorpay_signature,
                            planId,
                        );
                        if (verified?.success) {
                            setPaymentModal((prev) => ({ ...prev, status: 'success' }));
                            await fetchSubscription();
                            window.setTimeout(() => closePaymentModal(), 2000);
                        }
                    } catch {
                        setPaymentModal((prev) => ({ ...prev, status: 'error', error: { message: 'Verification failed' } }));
                    } finally {
                        setActionLoading({});
                    }
                },
                prefill: { name: user?.name, email: user?.email },
                theme: { color: '#4f46e5' },
                modal: { ondismiss: () => setActionLoading({}) },
            };

            const razorpay = new window.Razorpay(options);
            razorpay.open();
        } catch (error) {
            setActionLoading({});
            setPaymentModal((prev) => ({ ...prev, status: 'error', error: { message: error.message } }));
        }
    };

    const handleCancel = async () => {
        setActionLoading({ cancel: true });
        try {
            const res = await cancelSubscription('User requested cancellation');
            if (res.success) {
                showToast('Subscription cancelled.', 'success');
                await fetchSubscription();
            }
        } catch {
            showToast('Failed to cancel subscription');
        } finally {
            setActionLoading({});
        }
    };

    const currentPlanId = user?.subscription?.plan || 'FREE';
    const subStatus     = user?.subscription?.status || 'active';

    if (loadingPlans) return <LoadingScreen />;

    const currentPlanDetails = plans.find((p) => p.id === currentPlanId) || plans.find((p) => p.id === 'FREE');
    const participantLimit   = user?.subscription?.participantLimit || currentPlanDetails?.participants || 10000;
    const limitFree          = currentPlanId === 'TEAMS' ? 'Unlimited' : (currentPlanId === 'CREATOR' ? 30 : 5);

    return (
        <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cx(layout.page, 'min-h-screen pb-24')}
        >
            <AnimatePresence>
                {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
            </AnimatePresence>

            <PaymentModal
                isOpen={paymentModal.isOpen}
                status={paymentModal.status}
                planName={paymentModal.planName}
                amount={paymentModal.amount}
                error={paymentModal.error}
                onRetry={() => handleUpgrade(pendingPayment?.planId)}
                onClose={closePaymentModal}
            />

            <BreadCrumbs breadcrumbs={[{ label: 'Workspace' }, { label: 'Billing' }]} />

            <div className="space-y-8">
                {/* ── Current Plan ──────────────────────────────────────── */}
                <section className={layout.section}>
                    <CurrentPlanCard
                        currentPlanId={currentPlanId}
                        subStatus={subStatus}
                        expiryDate={user?.subscription?.expiryDate}
                        participantLimit={participantLimit}
                        actionLoading={actionLoading}
                        onCancel={handleCancel}
                        usage={usage}
                        limitFree={limitFree}
                    />
                </section>

                {/* ── Available Plans ───────────────────────────────────── */}
                {plans.length > 0 && (
                    <section className={layout.section}>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                                <Sparkles size={14} />
                            </div>
                            <h2 className={typography.h2}>Available Plans</h2>
                        </div>
                        <PlanGrid
                            plans={plans}
                            currentPlanId={currentPlanId}
                            actionLoading={actionLoading}
                            onUpgrade={handleUpgrade}
                        />
                    </section>
                )}
            </div>
        </Motion.div>
    );
};

export default BillingOverviewPage;
