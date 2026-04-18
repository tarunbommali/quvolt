import { AlertCircle, Loader2 } from 'lucide-react';
import Card from '../../common/ui/Card';
import Button from '../../common/ui/Button';
import { cardStyles } from '../../../styles/cardStyles';
import { motionStyles, textStyles, tagStyles } from '../../../styles/commonStyles';
import { buttonStyles } from '../../../styles/buttonStyles';

const CurrentPlanCard = ({
    currentPlanId,
    subStatus,
    expiryDate,
    participantLimit,
    commissionPercent,
    actionLoading,
    onCancel,
}) => (
    <Card className={cardStyles.billingHero}>
        <div>
            <h2 className={`${textStyles.overline} mb-2 flex items-center gap-2 text-indigo-900`}>
                Current Plan
            </h2>
            <div className={cardStyles.keyValueRow}>
                <span className={textStyles.value4Xl}>{currentPlanId}</span>
                {subStatus === 'active' ? (
                    <span className={`${tagStyles.base} ${tagStyles.live} mb-1`}>
                        Active
                    </span>
                ) : (
                    <span className={`${tagStyles.base} ${tagStyles.warning} mb-1`}>
                        {subStatus}
                    </span>
                )}
            </div>
            {expiryDate && (
                <p className={`mt-4 flex items-center gap-1.5 ${textStyles.captionStrong}`}>
                    <AlertCircle size={14} /> Renews / Expires: {new Date(expiryDate).toLocaleDateString()}
                </p>
            )}
            <p className={`mt-2 ${textStyles.captionStrong}`}>
                Participant cap: <span className={textStyles.valueDark}>{participantLimit?.toLocaleString?.() || participantLimit}</span> | Platform commission: <span className={textStyles.valueDark}>{commissionPercent}%</span>
            </p>
        </div>
        {currentPlanId !== 'FREE' && (
            <Button
                onClick={onCancel}
                disabled={actionLoading.cancel}
                className={`${buttonStyles.danger} rounded-xl px-6 py-3 font-bold`}
            >
                {actionLoading.cancel ? <Loader2 size={16} className={motionStyles.spin} /> : 'Cancel Subscription'}
            </Button>
        )}
    </Card>
);

export default CurrentPlanCard;
