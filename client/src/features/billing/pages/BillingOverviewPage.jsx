import React, { useEffect, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../../stores/useAuthStore';
import {
    cancelSubscription,
    createSubscriptionOrder,
    getHostPayoutSummary,
    getMyHostAccount,
    getPaymentHealth,
    getSubscriptionPlans,
    verifySubscriptionPayment,
    createRazorpaySubAccount,
    getRazorpayOnboardingLink,
    checkRazorpayKycStatus,
} from '../services/billing.service';
import { getMyQuizzes } from '../../quiz/services/quiz.service';
import useRazorpay from '../../../hooks/useRazorpay';
import useToast from '../../../hooks/useToast';
import Toast from '../../../components/common/Toast';
import LoadingScreen from '../../../components/common/LoadingScreen';
import BillingHeader from '../components/BillingHeader';
import CurrentPlanCard from '../components/CurrentPlanCard';
import UsageCards from '../components/UsageCards';
import PaymentOverviewCards from '../components/PaymentOverviewCards';
import BillingSidebar from '../components/BillingSidebar';
import PlanGrid from '../components/PlanGrid';
import RecentPaymentsCard from '../components/RecentPaymentsCard';
import PaymentModal from '../components/PaymentModal';

import { Layout, ShieldCheck, CreditCard, Wallet, Activity, ArrowRight, Sparkles } from 'lucide-react';
import { textStyles, components, layout, typography, cx } from '../../../styles/index';

const INR_SYMBOL = '₹';
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

                if (user?.role === 'host') {
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

        const checkKyc = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('kyc')) {
                try {
                    const res = await checkRazorpayKycStatus();
                    if (res.success && res.data) {
                        setHostAccount((prev) => ({ ...prev, ...res.data }));
                        if (res.data.accountStatus === 'verified') {
                            showToast('KYC successfully verified!', 'success');
                        } else {
                            showToast('KYC status updated: ' + res.data.accountStatus);
                        }
                    }
                } catch (error) {
                    console.error('KYC check failed', error);
                }
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        };

        fetchPlansAndUsage().then(checkKyc);
    }, [showToast, user?.role]);

    const closePaymentModal = () => {
        setPaymentModal((prev) => ({ ...prev, isOpen: false }));
        setPendingPayment(null);
    };

    const handleActionKyc = async () => {
        setHostAccount((prev) => ({ ...prev, isLoadingKyc: true }));
        try {
            if (!hostAccount || hostAccount.accountStatus === 'not_started' || hostAccount.accountStatus === 'pending_kyc') {
                const res = await createRazorpaySubAccount({
                    name: user.name,
                    email: user.email,
                    phone: user.participantProfile?.phone || ''
                });
                if (res.success) {
                    setHostAccount((prev) => ({ ...prev, ...res.data, isLoadingKyc: false }));
                    showToast('Sub-account created. Generating KYC link...', 'success');
                    const linkRes = await getRazorpayOnboardingLink();
                    if (linkRes.success && linkRes.data?.url) {
                        window.location.href = linkRes.data.url;
                    }
                }
            } else if (hostAccount.accountStatus === 'pending') {
                const res = await getRazorpayOnboardingLink();
                if (res.success && res.data?.url) {
                    window.location.href = res.data.url;
                }
            }
        } catch (error) {
            showToast(error.response?.data?.error?.message || 'Failed to process KYC action');
            setHostAccount((prev) => ({ ...prev, isLoadingKyc: false }));
        }
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
                    error: { message: 'Failed to load Razorpay SDK.' },
                }));
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
                    } catch (error) {
                        setPaymentModal((prev) => ({ ...prev, status: 'error', error: { message: 'Verification failed' } }));
                    } finally {
                        setActionLoading({});
                    }
                },
                prefill: { name: user?.name, email: user?.email },
                theme: { color: '#4f46e5' },
                modal: { ondismiss: () => setActionLoading({}) }
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
        } catch (error) {
            showToast('Failed to cancel subscription');
        } finally {
            setActionLoading({});
        }
    };

    const currentPlanId = user?.subscription?.plan || 'FREE';
    const subStatus = user?.subscription?.status || 'active';

    if (loadingPlans) return <LoadingScreen />;

    const currentPlanDetails = plans.find((p) => p.id === currentPlanId) || plans.find((p) => p.id === 'FREE');
    const participantLimit = user?.subscription?.participantLimit || currentPlanDetails?.participants || 10000;
    const commissionPercent = user?.subscription?.commissionPercent || currentPlanDetails?.commissionPercent || 25;
    const limitFree = currentPlanId === 'TEAMS' ? 'Unlimited' : (currentPlanId === 'CREATOR' ? 30 : 5);
    const limitJoin = participantLimit >= 1000 ? `${(participantLimit / 1000).toLocaleString()}k` : participantLimit;
    const totals = payoutSummary?.totals || { pending: 0, processing: 0, transferred: 0, blocked_kyc: 0 };

    const payoutCards = [
        { key: 'pending', label: 'Pending Payouts', value: totals.pending, tone: 'theme-text-muted' },
        { key: 'processing', label: 'In Processing', value: totals.processing, tone: 'text-indigo-500' },
        { key: 'transferred', label: 'Transferred', value: totals.transferred, tone: 'text-emerald-500' },
        { key: 'blocked_kyc', label: 'Verification Block', value: totals.blocked_kyc, tone: 'text-red-500' },
    ];

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

            <BillingHeader />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Main Content */}
                <div className="xl:col-span-8 space-y-8">
                    <section className={layout.section}>
                        <div className={layout.rowStart}>
                            <div className="w-7 h-7 rounded-lg bg-[var(--qb-primary)]/10 text-[var(--qb-primary)] flex items-center justify-center">
                                <ShieldCheck size={14} />
                            </div>
                            <h2 className={typography.h2}>Current Plan</h2>
                        </div>
                        <div className="space-y-4">
                            <CurrentPlanCard
                                currentPlanId={currentPlanId}
                                subStatus={subStatus}
                                expiryDate={user?.subscription?.expiryDate}
                                participantLimit={participantLimit}
                                commissionPercent={commissionPercent}
                                actionLoading={actionLoading}
                                onCancel={handleCancel}
                            />
                            <UsageCards usage={usage} limitFree={limitFree} commLimit={commissionPercent} participantLimit={participantLimit} />
                        </div>
                    </section>

                    {user?.role === 'host' && (
                        <section className={layout.section}>
                            <div className={layout.rowStart}>
                                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                    <Wallet size={14} />
                                </div>
                                <h2 className={typography.h2}>Finance Pipeline</h2>
                            </div>
                            <PaymentOverviewCards
                                paymentHealth={paymentHealth}
                                hostAccount={{ ...hostAccount, onActionKyc: handleActionKyc }}
                                payoutCards={payoutCards}
                                inrSymbol={INR_SYMBOL}
                            />
                        </section>
                    )}

                    <section className={layout.section}>
                        <div className={layout.rowStart}>
                            <div className="w-7 h-7 rounded-lg bg-[var(--qb-primary)]/10 text-[var(--qb-primary)] flex items-center justify-center">
                                <Activity size={14} />
                            </div>
                            <h2 className={typography.h2}>Available Plans</h2>
                        </div>
                        <PlanGrid
                            plans={plans}
                            currentPlanId={currentPlanId}
                            actionLoading={actionLoading}
                            onUpgrade={handleUpgrade}
                            inrSymbol={INR_SYMBOL}
                        />
                    </section>
                </div>

                {/* Sidebar */}
                <aside className="xl:col-span-4 relative">
                    <div className="xl:sticky xl:top-32 space-y-6">
                        <div className="space-y-3">
                            <div className={layout.rowStart}>
                                <Sparkles size={14} className="text-[var(--qb-primary)]" />
                                <p className={typography.eyebrow}>System Insights</p>
                            </div>
                            <BillingSidebar
                                limitJoin={limitJoin}
                                hostAccount={hostAccount}
                                ishost={user?.role === 'host'}
                            />
                        </div>

                        {user?.role === 'host' && (
                            <div className="space-y-3">
                                <div className={layout.rowStart}>
                                    <Activity size={14} className="text-emerald-500" />
                                    <p className={typography.eyebrow}>Ledger History</p>
                                </div>
                                <RecentPaymentsCard payoutSummary={payoutSummary} inrSymbol={INR_SYMBOL} />
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </Motion.div>
    );
};

export default BillingOverviewPage;
