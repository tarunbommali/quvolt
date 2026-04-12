import { CreditCard } from 'lucide-react';
import Card from '../ui/Card';
import { cardStyles } from '../../styles/cardStyles';
import { textStyles } from '../../styles/commonStyles';

const RecentPaymentsCard = ({ payoutSummary, inrSymbol }) => (
    <Card className={cardStyles.billingCard}>
        <div className={cardStyles.iconTextRow}>
            <div>
                <h2 className={textStyles.title}>Recent Payment Tracking</h2>
                <p className={`mt-2 font-medium ${textStyles.subtitle}`}>Latest completed quiz payments and payout movement.</p>
            </div>
            <CreditCard className={textStyles.valueIndigo} />
        </div>

        {payoutSummary?.recent?.length ? (
            <div className={cardStyles.stackSm}>
                {payoutSummary.recent.slice(0, 8).map((entry, index) => (
                    <div
                        key={`${entry.quizId}-${entry.updatedAt}-${index}`}
                        className={cardStyles.paymentEntry}
                    >
                        <div>
                            <p className={textStyles.metaLabel}>Quiz ID</p>
                            <p className={`${textStyles.valueDark} truncate`}>{entry.quizId}</p>
                        </div>
                        <div>
                            <p className={textStyles.metaLabel}>Gross</p>
                            <p className={textStyles.valueDark}>{inrSymbol}{Number(entry.amount || 0).toFixed(2)}</p>
                        </div>
                        <div>
                            <p className={textStyles.metaLabel}>Host</p>
                            <p className={textStyles.valueSuccess}>{inrSymbol}{Number(entry.hostAmount || 0).toFixed(2)}</p>
                        </div>
                        <div>
                            <p className={textStyles.metaLabel}>Platform Fee</p>
                            <p className={textStyles.valueIndigo}>{inrSymbol}{Number(entry.platformFeeAmount || 0).toFixed(2)}</p>
                        </div>
                        <div>
                            <p className={textStyles.metaLabel}>Payout Status</p>
                            <p className={textStyles.valueDark}>{entry.payoutStatus}</p>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className={cardStyles.emptyDashed}>
                No completed payment records yet.
            </div>
        )}
    </Card>
);

export default RecentPaymentsCard;
