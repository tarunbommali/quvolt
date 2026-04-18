import { Activity, Wallet } from 'lucide-react';
import { cx } from '../../../styles/theme';
import { textStyles } from '../../../styles/commonStyles';

/**
 * PaymentOverviewCards — "Live Analytics" section.
 * Renders real-time gateway health and host earnings tracking.
 *
 * Updated typography to match the style of UsageCards (Free/Paid Quizzes)
 * for a consistent system-wide appearance across Light/Dark modes.
 *
 * @param {Object} props
 * @param {Object} props.paymentHealth - Gateway health check results.
 * @param {Object} props.hostAccount - Host-specific payout and KYC data.
 * @param {Array} props.payoutCards - Status-categorized payout metrics.
 * @param {string} props.inrSymbol - Localized currency symbol.
 */
const PaymentOverviewCards = ({ paymentHealth, hostAccount, payoutCards, inrSymbol }) => (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        {/* ── Gateway & Settlement card ── */}
        <div className="relative overflow-hidden rounded-[1.75rem] border theme-border theme-surface p-6 shadow-sm theme-interactive">
            {/* Ambient glow */}
            <div className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-[color-mix(in_srgb,var(--qb-primary)_8%,transparent)] blur-3xl" aria-hidden="true" />

            <div className="relative space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className={`${textStyles.overline} mb-1`}>
                            Payment System
                        </p>
                        <p className={textStyles.titleXl}>
                            Gateway &amp; Settlement
                        </p>
                    </div>
                    <div
                        className={cx(
                            'flex h-10 w-10 items-center justify-center rounded-xl border',
                            paymentHealth?.status === 'healthy'
                                ? 'theme-status-success'
                                : 'theme-status-danger',
                        )}
                    >
                        <Activity size={18} />
                    </div>
                </div>

                {/* Rows */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl border theme-border theme-surface-soft px-4 py-3">
                        <span className={textStyles.captionStrong}>Service Health</span>
                        <span
                            className={cx(
                                'text-sm font-bold capitalize',
                                paymentHealth?.status === 'healthy' ? 'theme-tone-success' : 'theme-tone-danger',
                            )}
                        >
                            {paymentHealth?.status || 'Unavailable'}
                        </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border theme-border theme-surface-soft px-4 py-3">
                        <span className={textStyles.captionStrong}>KYC Status</span>
                        <span
                            className={cx(
                                'text-sm font-bold capitalize',
                                hostAccount?.accountStatus === 'active' ? 'theme-tone-success' : 'theme-tone-warning',
                            )}
                        >
                            {hostAccount?.accountStatus || 'Not linked'}
                        </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border theme-border theme-surface-soft px-4 py-3">
                        <span className={textStyles.captionStrong}>Settlement Mode</span>
                        <span className={`${textStyles.captionStrong} theme-text-primary`}>
                            {hostAccount?.settlementMode || 'Not configured'}
                        </span>
                    </div>
                </div>

                {/* Status note */}
                <div className="rounded-xl border theme-status-info px-4 py-3 text-xs font-bold">
                    {hostAccount?.accountStatus === 'active'
                        ? '✓ Host payouts are enabled.'
                        : 'Payouts are blocked until host KYC and linked account activation are complete.'}
                </div>
            </div>
        </div>

        {/* ── Payout Tracking card ── */}
        <div className="relative overflow-hidden rounded-[1.75rem] border theme-border theme-surface p-6 shadow-sm theme-interactive">
            {/* Ambient glow */}
            <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[color-mix(in_srgb,var(--qb-accent)_8%,transparent)] blur-3xl" aria-hidden="true" />

            <div className="relative space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className={`${textStyles.overline} mb-1`}>
                            Payout Tracking
                        </p>
                        <p className={textStyles.titleXl}>
                            Host Earnings Pipeline
                        </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border theme-status-info">
                        <Wallet size={18} />
                    </div>
                </div>

                {/* Payout metric tiles */}
                <div className="grid grid-cols-2 gap-3">
                    {payoutCards.map((card) => {
                        return (
                            <div
                                key={card.key}
                                className="rounded-2xl border theme-border theme-surface-soft px-4 py-4"
                            >
                                <p className={textStyles.tinyMuted}>
                                    {card.label}
                                </p>
                                <p className={cx('mt-1 text-2xl font-semibold leading-none', card.tone)}>
                                    {inrSymbol}{Number(card.value || 0).toFixed(2)}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    </div>
);

export default PaymentOverviewCards;
