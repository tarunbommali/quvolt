import { AlertCircle, CheckCircle, Loader, X } from 'lucide-react';
import Card from '../../../components/common/ui/Card';
import Button from '../../../components/common/ui/Button';
import { modalStyles } from '../../../styles/layoutStyles';
import { textStyles } from '../../../styles/commonStyles';
import { buttonStyles } from '../../../styles/buttonStyles';

const INR_SYMBOL = '\u20B9';

const PaymentModal = ({
    isOpen,
    status,
    planName,
    amount,
    error,
    onRetry,
    onClose,
}) => {
    if (!isOpen) return null;

    return (
        <>
            <div
                className={modalStyles.overlayLight}
                onClick={status !== 'processing' ? onClose : undefined}
            />

            <Card className={`${modalStyles.shellCenter} ${modalStyles.shellPanel}`}>
                {status !== 'processing' && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <X size={20} className="text-gray-500 dark:text-gray-300" />
                    </button>
                )}

                {status === 'pending' && (
                    <div className="space-y-6 text-center">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40">
                            <Loader size={32} className="animate-spin text-indigo-600 dark:text-indigo-300" />
                        </div>
                        <div>
                            <h3 className="mb-2 text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100">Initializing Payment</h3>
                            <p className={textStyles.subtitle}>
                                Preparing your checkout for <br />
                                <span className="font-medium text-indigo-600 dark:text-indigo-300">{planName} Plan</span>
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-700/40">
                            <p className="mb-1 text-sm text-gray-600 dark:text-gray-400">Amount to Pay</p>
                            <p className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100">{INR_SYMBOL}{amount}</p>
                        </div>
                    </div>
                )}

                {status === 'processing' && (
                    <div className="space-y-6 text-center">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                            <Loader size={32} className="animate-spin text-blue-600 dark:text-blue-300" />
                        </div>
                        <div>
                            <h3 className="mb-2 text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100">Processing Payment</h3>
                            <p className={textStyles.subtitle}>
                                Please do not close this window or your browser.
                                <br />We are securely processing your payment.
                            </p>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600 dark:bg-blue-400" />
                            <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600 dark:bg-blue-400" style={{ animationDelay: '0.2s' }} />
                            <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600 dark:bg-blue-400" style={{ animationDelay: '0.4s' }} />
                        </div>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-6 text-center">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                            <CheckCircle size={32} className="text-green-600 dark:text-green-300" />
                        </div>
                        <div>
                            <h3 className="mb-2 text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100">Payment Successful!</h3>
                            <p className={textStyles.subtitle}>
                                Your subscription to <br />
                                <span className="font-medium text-green-600 dark:text-green-300">{planName} Plan</span>
                                <br />
                                has been activated.
                            </p>
                        </div>
                        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-900/30">
                            <p className="mb-1 text-sm text-green-700 dark:text-green-300">Amount Paid</p>
                            <p className="text-xl md:text-2xl font-semibold text-green-700 dark:text-green-300">{INR_SYMBOL}{amount}</p>
                        </div>
                        <Button
                            onClick={onClose}
                            className={`w-full rounded-xl py-3 ${buttonStyles.success}`}
                        >
                            Continue
                        </Button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-6 text-center">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                            <AlertCircle size={32} className="text-red-600 dark:text-red-300" />
                        </div>
                        <div>
                            <h3 className="mb-2 text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100">Payment Failed</h3>
                            <p className={`mb-3 ${textStyles.subtitle}`}>
                                {error?.message || 'An error occurred while processing your payment.'}
                            </p>
                            {error?.details && (
                                <div className="rounded bg-red-50 p-2 font-mono text-xs text-red-600 dark:bg-red-900/30 dark:text-red-300">
                                    {error.details}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <Button
                                onClick={onRetry}
                                className={`flex-1 rounded-xl py-3 ${buttonStyles.primary}`}
                            >
                                Try Again
                            </Button>
                            <Button
                                onClick={onClose}
                                className={`flex-1 rounded-xl py-3 ${buttonStyles.secondary}`}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </>
    );
};

export default PaymentModal;

