import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/useAuthStore';
import {
    cancelSubscription,
    createSubscriptionOrder,
    getHostPayoutSummary,
    getMyHostAccount,
    getMyQuizzes,
    getPaymentHealth,
    getSubscriptionPlans,
    verifySubscriptionPayment,
} from '../services/api';
import useRazorpay from '../hooks/useRazorpay';
import useToast from '../hooks/useToast';
import Toast from '../components/common/Toast';
import BillingLoadingState from '../components/billing/BillingLoadingState';
import CurrentPlanCard from '../components/billing/CurrentPlanCard';
import UsageCards from '../components/billing/UsageCards';
import PaymentOverviewCards from '../components/billing/PaymentOverviewCards';
import BillingSidebar from '../components/billing/BillingSidebar';
import PlanGrid from '../components/billing/PlanGrid';
import RecentPaymentsCard from '../components/billing/RecentPaymentsCard';
import PaymentModal from '../components/billing/PaymentModal';
import SubHeader from '../components/layout/SubHeader';

const INR_SYMBOL = '\u20B9';
const INITIAL_PAYMENT_MODAL = {
    isOpen: false,
    status: 'pending',
    planName: '',
    amount: 0,
    error: null,
    currentPlanId: null,
};

const Billing = () => {
    const { user, fetchSubscription } = useAuthStore();
    const { loadRazorpayScript } = useRazorpay();
    const { toast, showToast, clearToast } = useToast();

    const [plans, setPlans] = useState([]);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [actionLoading, setActionLoading] = useState({});
    const [usage, setUsage] = useState({ freeCreated: 0, paidCreated: 0 });
    const [payoutSummary, setPayoutSummary] = useState(null);
    const [hostAccount, setHostAccount] = useState(null);
    const [paymentHealth, setPaymentHealth] = useState(null);
    const [paymentModal, setPaymentModal] = useState(INITIAL_PAYMENT_MODAL);
    const [pendingPayment, setPendingPayment] = useState(null);

    useEffect(() => {
        const fetchPlansAndUsage = async () => {
            try {
                const [planRes, quizRes] = await Promise.allSettled([
                    getSubscriptionPlans(),
                    getMyQuizzes(),
                ]);

                if (planRes.status === 'fulfilled' && planRes.value?.success) {
                    setPlans(planRes.value.data);
                }

                if (quizRes.status === 'fulfilled' && Array.isArray(quizRes.value)) {
                    let freeCount = 0;
                    let paidCount = 0;
                    quizRes.value.forEach((quiz) => {
                        if (quiz.isPaid) paidCount++;
                        else freeCount++;
                    });
                    setUsage({ freeCreated: freeCount, paidCreated: paidCount });
                }

                if (user?.role === 'organizer') {
                    const [payoutRes, hostAccountRes, paymentHealthRes] = await Promise.allSettled([
                        getHostPayoutSummary(),
                        getMyHostAccount(),
                        getPaymentHealth(),
                    ]);

                    setPayoutSummary(
                        payoutRes.status === 'fulfilled' && payoutRes.value?.success
                            ? payoutRes.value.data
                            : { totals: {}, recent: [] },
                    );
                    setHostAccount(
                        hostAccountRes.status === 'fulfilled' && hostAccountRes.value?.success
                            ? hostAccountRes.value.data
                            : null,
                    );
                    setPaymentHealth(
                        paymentHealthRes.status === 'fulfilled' && paymentHealthRes.value
                            ? paymentHealthRes.value
                            : { status: 'unavailable' },
                    );

                    if (
                        payoutRes.status === 'rejected' ||
                        hostAccountRes.status === 'rejected' ||
                        paymentHealthRes.status === 'rejected'
                    ) {
                        showToast('Some payment tracking data is temporarily unavailable.');
                    }
                }
            } catch (error) {
                console.error('Failed to fetch billing data', error);
                showToast('Failed to load billing details.');
            } finally {
                setLoadingPlans(false);
            }
        };

        fetchPlansAndUsage();
    }, [showToast, user?.role]);

    const closePaymentModal = () => {
        setPaymentModal((prev) => ({ ...prev, isOpen: false }));
        setPendingPayment(null);
    };

    const handleUpgrade = async (planId) => {
        setActionLoading({ [planId]: true });

        try {
            const plan = plans.find((entry) => entry.id === planId);
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
                setPaymentModal((prev) => ({
                    ...prev,
                    status: 'error',
                    error: { message: 'Failed to load Razorpay SDK. Please check your connection.' },
                }));
                showToast('Failed to load Razorpay SDK. Check your connection.');
                return;
            }

            setPaymentModal((prev) => ({ ...prev, status: 'processing' }));

            const orderRes = await createSubscriptionOrder(planId);
            if (!orderRes.success) {
                throw {
                    message: orderRes.error?.message || 'Failed to create order',
                    details: orderRes.error?.details,
                };
            }

            if (planId === 'FREE') {
                await fetchSubscription();
                setPaymentModal((prev) => ({ ...prev, status: 'success' }));
                showToast('Successfully downgraded to FREE plan', 'success');
                window.setTimeout(() => closePaymentModal(), 1500);
                setActionLoading({});
                return;
            }

            const { orderId, amount, currency, key } = orderRes.data;

            if (orderRes.data?.mock) {
                try {
                    const verified = await verifySubscriptionPayment(
                        orderId,
                        `mock_payment_${Date.now()}`,
                        'mock_signature',
                        planId,
                    );

                    if (verified?.success) {
                        setPaymentModal((prev) => ({ ...prev, status: 'success' }));
                        await fetchSubscription();
                        showToast(`Successfully upgraded to ${planId}!`, 'success');
                        window.setTimeout(() => closePaymentModal(), 1200);
                    }
                } catch (error) {
                    const errorMsg = error.response?.data?.error?.message || 'Mock payment verification failed';
                    setPaymentModal((prev) => ({
                        ...prev,
                        status: 'error',
                        error: { message: errorMsg },
                    }));
                    showToast(errorMsg);
                } finally {
                    setActionLoading({});
                }
                return;
            }

            const options = {
                key,
                amount: amount * 100,
                currency,
                name: 'Quvolt',
                description: `Upgrade to ${planId} plan`,
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
                            showToast(`Successfully upgraded to ${planId}!`, 'success');
                            window.setTimeout(() => closePaymentModal(), 2000);
                        }
                    } catch (error) {
                        const errorMsg = error.response?.data?.error?.message || 'Payment verification failed';
                        setPaymentModal((prev) => ({
                            ...prev,
                            status: 'error',
                            error: { message: errorMsg },
                        }));
                        showToast(errorMsg);
                    } finally {
                        setActionLoading({});
                    }
                },
                prefill: {
                    name: user?.name,
                    email: user?.email,
                },
                theme: { color: '#4f46e5' },
                modal: {
                    ondismiss: () => {
                        setActionLoading({});
                        setPaymentModal((prev) => ({
                            ...prev,
                            status: 'error',
                            error: { message: 'Payment window closed. Please try again.' },
                        }));
                    },
                },
            };

            const razorpay = new window.Razorpay(options);
            razorpay.on('payment.failed', (response) => {
                setPaymentModal((prev) => ({
                    ...prev,
                    status: 'error',
                    error: { message: response.error.description },
                }));
                showToast(response.error.description);
            });
            razorpay.open();
        } catch (error) {
            setActionLoading({});
            const errorMsg =
                error.message ||
                error.response?.data?.error?.message ||
                'Error initializing checkout';
            const errorDetails = error.details || error.response?.data?.error?.details;
            setPaymentModal((prev) => ({
                ...prev,
                status: 'error',
                error: { message: errorMsg, details: errorDetails },
            }));
            showToast(errorMsg);
        }
    };

    const handleRetryPayment = () => {
        if (!pendingPayment) return;
        closePaymentModal();
        handleUpgrade(pendingPayment.planId);
    };

    const handleCancel = async () => {
        setActionLoading({ cancel: true });
        try {
            const res = await cancelSubscription('User requested cancellation via billing dashboard');
            if (res.success) {
                showToast('Subscription cancelled.', 'success');
                await fetchSubscription();
            }
        } catch (error) {
            showToast(error.response?.data?.error?.message || 'Failed to cancel subscription');
        } finally {
            setActionLoading({});
        }
    };

    const currentPlanId = user?.plan || 'FREE';
    const subStatus = user?.subscription?.status || 'active';
    const participantLimit = user?.participantLimit || user?.subscription?.participantLimit || (currentPlanId === 'PREMIUM' ? 25000 : currentPlanId === 'PRO' ? 15000 : 10000);
    const commissionPercent = user?.commissionPercent || user?.subscription?.commissionPercent || (currentPlanId === 'PREMIUM' ? 5 : currentPlanId === 'PRO' ? 10 : 25);

    if (loadingPlans) return <BillingLoadingState />;

    const currentPlanDetails = plans.find((plan) => plan.id === currentPlanId) || plans.find((plan) => plan.id === 'FREE');
    const limitFree = currentPlanId === 'PREMIUM' ? 25 : currentPlanId === 'PRO' ? 15 : 5;
    const limitJoin = currentPlanId === 'PREMIUM' ? '25k' : currentPlanId === 'PRO' ? '15k' : '10k';
    const commLimit = currentPlanDetails?.commissionPercent || 25;
    const dashboardHref = user?.role === 'organizer' || user?.role === 'admin' ? '/studio' : '/join';
    const billingBreadcrumbs = [
        { label: 'Dashboard', href: dashboardHref },
        { label: 'Billing' },
    ];
    const totals = payoutSummary?.totals || {
        pending: 0,
        processing: 0,
        transferred: 0,
        blocked_kyc: 0,
        reversed: 0,
        failed: 0,
    };

    const payoutCards = [
        { key: 'pending', label: 'Pending', value: totals.pending, tone: 'text-amber-600' },
        { key: 'processing', label: 'Processing', value: totals.processing, tone: 'text-indigo-600' },
        { key: 'transferred', label: 'Transferred', value: totals.transferred, tone: 'text-emerald-600' },
        { key: 'blocked_kyc', label: 'Blocked KYC', value: totals.blocked_kyc, tone: 'text-red-600' },
    ];

    return (
        <div className="app-page space-y-6 animate-in fade-in duration-500">
            <AnimatePresence>
                {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
            </AnimatePresence>

            <PaymentModal
                isOpen={paymentModal.isOpen}
                status={paymentModal.status}
                planName={paymentModal.planName}
                amount={paymentModal.amount}
                error={paymentModal.error}
                onRetry={handleRetryPayment}
                onClose={closePaymentModal}
            />

            <SubHeader
                title="Billing"
                subtitle="Manage your subscription plan, billing details, and payment history."
                breadcrumbs={billingBreadcrumbs}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <CurrentPlanCard
                        currentPlanId={currentPlanId}
                        subStatus={subStatus}
                        expiryDate={user?.subscription?.expiryDate}
                        participantLimit={participantLimit}
                        commissionPercent={commissionPercent}
                        actionLoading={actionLoading}
                        onCancel={handleCancel}
                    />

                    <UsageCards usage={usage} limitFree={limitFree} commLimit={commLimit} participantLimit={participantLimit} />

                    {user?.role === 'organizer' && (
                        <PaymentOverviewCards
                            paymentHealth={paymentHealth}
                            hostAccount={hostAccount}
                            payoutCards={payoutCards}
                            inrSymbol={INR_SYMBOL}
                        />
                    )}
                </div>

                <BillingSidebar
                    limitJoin={limitJoin}
                    hostAccount={hostAccount}
                    isOrganizer={user?.role === 'organizer'}
                />
            </div>

            <PlanGrid
                plans={plans}
                currentPlanId={currentPlanId}
                actionLoading={actionLoading}
                onUpgrade={handleUpgrade}
                inrSymbol={INR_SYMBOL}
            />

            {user?.role === 'organizer' && (
                <RecentPaymentsCard payoutSummary={payoutSummary} inrSymbol={INR_SYMBOL} />
            )}
        </div>
    );
};

export default Billing;
