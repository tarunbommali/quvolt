import { CircleAlert, ShieldCheck, Zap } from 'lucide-react';
import Card from '../../../components/common/ui/Card';
import { textStyles } from '../../../styles/commonStyles';

/**
 * BillingSidebar component providing contextual information and analytics.
 * Features a "Live Analytics" section and host "Account Readiness" status.
 * Optimized for the Quvolt design system with theme-aware tokens.
 *
 * @param {Object} props
 * @param {string} props.limitJoin - Display string for participant limits (e.g. "10k").
 * @param {Object} props.hostAccount - Host account status and details from payout summary.
 * @param {boolean} props.ishost - Flag indicating if the current user has host permissions.
 */
const BillingSidebar = ({ limitJoin, hostAccount, ishost }) => (
    <div className="space-y-6">
        <Card className="relative overflow-hidden rounded-2xl border theme-border theme-surface p-4 md:p-6 shadow-sm theme-interactive">
            {/* Background Icon */}
            <div className="absolute top-0 right-0 p-8 theme-text-muted opacity-10">
                <Zap size={100} />
            </div>

            <h3 className={`${textStyles.overline} relative mb-4`}>Live Analytics</h3>
            <div className="relative flex items-end gap-2">
                <p className="text-3xl font-semibold theme-text-primary">{limitJoin || '0'}</p>
                <p className="mb-1 text-sm text-slate-400">Max concurrent participants</p>
            </div>

            <div className="mt-6 pt-6 border-t theme-border">
                <p className={`${textStyles.captionStrong} relative leading-relaxed`}>
                    To increase limits and reduce platform commission rates to as low as 5%, upgrade your tier below.
                </p>
            </div>
        </Card>

        {ishost && (
            <Card className="space-y-4 rounded-2xl border theme-border theme-surface p-4 md:p-6 shadow-sm">
                <div className="flex items-center gap-3">
                    {hostAccount?.accountStatus === 'active' ? (
                        <ShieldCheck className="theme-tone-success" size={20} />
                    ) : (
                        <CircleAlert className="theme-tone-warning" size={20} />
                    )}
                    <h3 className={textStyles.overline}>Account Readiness</h3>
                </div>
                <p className="text-lg font-semibold theme-text-primary">
                    {hostAccount?.accountStatus === 'active' ? 'Payout-ready host account' : 'Action needed before settlement'}
                </p>
                <p className={textStyles.captionStrong}>
                    {hostAccount?.linkedAccountId
                        ? `Linked account: ${hostAccount.linkedAccountId}`
                        : 'No linked payout account found for this host.'}
                </p>
            </Card>
        )}
    </div>
);

export default BillingSidebar;

