import { AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import Card from '../ui/Card';
import { cardStyles } from '../../styles/cardStyles';
import { textStyles } from '../../styles/commonStyles';

const PaymentStatusCard = ({ status, lastPaymentDate, nextPaymentDate, amount, planName }) => {
    const statusConfig = {
        success: {
            icon: CheckCircle,
            label: 'Payment Successful',
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
        },
        failed: {
            icon: XCircle,
            label: 'Payment Failed',
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
        },
        pending: {
            icon: Clock,
            label: 'Payment Pending',
            color: 'theme-tone-warning',
            bgColor: 'theme-status-warning',
            borderColor: '',
        },
        processing: {
            icon: Clock,
            label: 'Processing',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
        },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
        <Card className={`${cardStyles.statusCardBase} ${config.bgColor} ${config.borderColor}`}>
            <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <Icon size={24} className={config.color} />
                    <div>
                        <h3 className="font-bold text-slate-900">{config.label}</h3>
                        <p className={`mt-1 ${textStyles.captionStrong}`}>{planName} Plan</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className={textStyles.titleLg}>₹{amount}</p>
                </div>
            </div>

            {(lastPaymentDate || nextPaymentDate) && (
                <div className={`${cardStyles.detailGrid2} ${cardStyles.borderedTop}`}>
                    {lastPaymentDate && (
                        <div>
                            <p className={`${textStyles.metaValue} mb-1 text-xs`}>Last Payment</p>
                            <p className="text-sm font-bold text-slate-900">
                                {new Date(lastPaymentDate).toLocaleDateString()}
                            </p>
                        </div>
                    )}
                    {nextPaymentDate && (
                        <div>
                            <p className={`${textStyles.metaValue} mb-1 text-xs`}>Next Renewal</p>
                            <p className="text-sm font-bold text-slate-900">
                                {new Date(nextPaymentDate).toLocaleDateString()}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};

export default PaymentStatusCard;
