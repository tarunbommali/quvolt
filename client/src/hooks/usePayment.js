import { useCallback } from 'react';
import useRazorpay from './useRazorpay';
import { paymentApi } from '../services/payment.api';
import { useToast } from './useToast';

const usePayment = () => {
    const { loadRazorpayScript } = useRazorpay();
    const { toast } = useToast();

    const processSubscription = useCallback(async (planId, onGhostSuccess) => {
        try {
            const isLoaded = await loadRazorpayScript();
            if (!isLoaded) {
                toast({ title: 'Payment Error', message: 'Razorpay SDK failed to load. Check your connection.', type: 'error' });
                return;
            }

            const { data: orderData } = await paymentApi.createSubscriptionOrder(planId);

            if (orderData.type === 'FREE') {
                toast({ title: 'Success', message: 'You are now on the Free plan!', type: 'success' });
                if (onGhostSuccess) onGhostSuccess(orderData.subscription);
                return;
            }

            const options = {
                key: orderData.key,
                amount: orderData.amount * 100,
                currency: 'INR',
                name: 'Quvolt SaaS',
                description: `${planId} Subscription`,
                order_id: orderData.orderId,
                handler: async (response) => {
                    try {
                        const { data: verifyData } = await paymentApi.verifySubscription({
                            orderId: orderData.orderId,
                            paymentId: response.razorpay_payment_id,
                            signature: response.razorpay_signature,
                            planId
                        });
                        toast({ title: 'Success', message: 'Subscription upgraded successfully!', type: 'success' });
                        if (onGhostSuccess) onGhostSuccess(verifyData.subscription);
                    } catch (err) {
                        toast({ title: 'Verification Failed', message: 'Payment verification failed. Please contact support.', type: 'error' });
                    }
                },
                modal: {
                    ondismiss: () => {
                        toast({ title: 'Payment Cancelled', message: 'You cancelled the checkout process.', type: 'info' });
                    }
                },
                prefill: {
                    name: '',
                    email: '',
                },
                theme: {
                    color: '#6366f1',
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            toast({ title: 'Order Failed', message: err.response?.data?.message || 'Failed to initialize payment.', type: 'error' });
        }
    }, [loadRazorpayScript, toast]);

    const purchaseQuiz = useCallback(async (quizId, amount, onQuizSuccess) => {
        try {
            const isLoaded = await loadRazorpayScript();
            if (!isLoaded) return;

            const { data: orderData } = await paymentApi.createQuizOrder(quizId, amount);

            const options = {
                key: orderData.key,
                amount: orderData.amount * 100,
                currency: 'INR',
                name: 'Quvolt Quiz',
                description: `Entry for Quiz ${quizId}`,
                order_id: orderData.orderId,
                handler: async (response) => {
                    try {
                        await paymentApi.verifyQuizPayment({
                            orderId: orderData.orderId,
                            paymentId: response.razorpay_payment_id,
                            signature: response.razorpay_signature,
                            quizId
                        });
                        toast({ title: 'Access Granted', message: 'You can now join the quiz!', type: 'success' });
                        if (onQuizSuccess) onQuizSuccess();
                    } catch (err) {
                        toast({ title: 'Verification Failed', message: 'Payment verification failed.', type: 'error' });
                    }
                },
                prefill: {
                    name: '',
                    email: '',
                },
                theme: {
                    color: '#6366f1',
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            toast({ title: 'Payment Failed', message: err.response?.data?.message || 'Failed to process payment.', type: 'error' });
        }
    }, [loadRazorpayScript, toast]);

    return { processSubscription, purchaseQuiz };
};

export default usePayment;
