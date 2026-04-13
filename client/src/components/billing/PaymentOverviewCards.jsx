import { Activity, Wallet } from 'lucide-react';
import Card from '../ui/Card';
import { cardStyles } from '../../styles/cardStyles';
import { textStyles } from '../../styles/commonStyles';
import { layoutStyles } from '../../styles/layoutStyles';

const PaymentOverviewCards = ({ paymentHealth, hostAccount, payoutCards, inrSymbol }) => (
    <div className={layoutStyles.twoColXl}>
        <Card className={cardStyles.billingCard}>
            <div className={cardStyles.iconTextRow}>
                <div>
                    <h3 className={textStyles.overline}>Payment System</h3>
                    <p className={`mt-2 ${textStyles.titleXl}`}>Gateway & Settlement</p>
                </div>
                <Activity className={paymentHealth?.status === 'healthy' ? 'theme-tone-success' : 'theme-tone-danger'} />
            </div>
            <div className={cardStyles.stackMdStrong}>
                <div className={cardStyles.infoRow}>
                    <span className={textStyles.subtitle}>Service Health</span>
                    <span className={paymentHealth?.status === 'healthy' ? 'theme-tone-success' : 'theme-tone-danger'}>
                        {paymentHealth?.status || 'Unavailable'}
                    </span>
                </div>
                <div className={cardStyles.infoRow}>
                    <span className={textStyles.subtitle}>KYC Status</span>
                    <span className={hostAccount?.accountStatus === 'active' ? 'theme-tone-success' : 'theme-tone-warning'}>
                        {hostAccount?.accountStatus || 'Not linked'}
                    </span>
                </div>
                <div className={cardStyles.infoRow}>
                    <span className={textStyles.subtitle}>Settlement Mode</span>
                    <span className={textStyles.valueDark}>{hostAccount?.settlementMode || 'Not configured'}</span>
                </div>
                <div className={cardStyles.dashedInfo}>
                    {hostAccount?.accountStatus === 'active'
                        ? 'Host payouts are enabled.'
                        : 'Payouts are blocked until host KYC and linked account activation are complete.'}
                </div>
            </div>
        </Card>

        <Card className={cardStyles.billingCard}>
            <div className={cardStyles.iconTextRow}>
                <div>
                    <h3 className={textStyles.overline}>Payout Tracking</h3>
                    <p className={`mt-2 ${textStyles.titleXl}`}>Host Earnings Pipeline</p>
                </div>
                <Wallet className={textStyles.valueIndigo} />
            </div>
            <div className={cardStyles.detailGrid2}>
                {payoutCards.map((card) => (
                    <div key={card.key} className={cardStyles.billingSubCard}>
                        <p className={textStyles.metaLabel}>{card.label}</p>
                        <p className={`mt-2 text-xl md:text-2xl font-semibold ${card.tone}`}>{inrSymbol}{Number(card.value || 0).toFixed(2)}</p>
                    </div>
                ))}
            </div>
        </Card>
    </div>
);

export default PaymentOverviewCards;
