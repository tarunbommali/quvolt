import Card from '../ui/Card';
import { cardStyles } from '../../styles/cardStyles';
import { textStyles } from '../../styles/commonStyles';

const UsageCards = ({ usage, limitFree, commLimit, participantLimit }) => (
    <div className={cardStyles.usageGrid}>
        <Card className={`${cardStyles.usageCard} group hover:border-indigo-200`}>
            <div className={`${cardStyles.usageOrb} bg-indigo-50`}></div>
            <h3 className={`${textStyles.overline} relative mb-4`}>Free Quizzes Usage</h3>
            <div className={`${cardStyles.valueRow} relative`}>
                <span className={`text-3xl font-semibold ${usage.freeCreated >= limitFree ? 'text-red-500' : 'text-slate-900'}`}>
                    {usage.freeCreated}
                </span>
                <span className="mb-1 text-sm text-slate-400">/ {limitFree} Allowed</span>
            </div>
            <div className={cardStyles.usageProgressWrap}>
                <div
                    className={`${cardStyles.usageProgressFill} ${usage.freeCreated >= limitFree ? 'bg-red-500' : 'bg-indigo-500'}`}
                    style={{ width: `${Math.min((usage.freeCreated / limitFree) * 100, 100)}%` }}
                ></div>
            </div>
        </Card>

        <Card className={`${cardStyles.usageCard} group hover:border-emerald-200`}>
            <div className={`${cardStyles.usageOrb} bg-emerald-50`}></div>
            <h3 className={`${textStyles.overline} relative mb-4`}>Paid Quizzes Usage</h3>
            <div className={`${cardStyles.valueRow} relative`}>
                <span className="text-3xl font-semibold text-emerald-600">{usage.paidCreated}</span>
                <span className="mb-1 text-sm text-slate-400">/ Unlimited</span>
            </div>
            <p className={`relative mt-4 ${textStyles.captionStrong}`}>
                Platform Commission: <span className="text-slate-900">{commLimit}%</span>
            </p>
            <p className={`relative mt-2 ${textStyles.captionStrong}`}>
                Current participant limit: <span className="text-slate-900">{participantLimit?.toLocaleString?.() || participantLimit}</span>
            </p>
        </Card>
    </div>
);

export default UsageCards;
