import React from 'react';
import { ShieldCheck, Wallet } from 'lucide-react';
import SubHeader from '../../../components/layout/SubHeader';
import { typography, cx } from '../../../styles/index';

const BillingHeader = () => (
    <SubHeader
        title="Billing"
        subtitle="Manage your subscription, usage, and payment details."
        breadcrumbs={[
            { label: 'Dashboard', href: '/' },
            { label: 'Billing' },
        ]}
        actions={(
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl theme-surface border theme-border">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck size={13} />
                </div>
                <div>
                    <p className={typography.micro}>Compliance</p>
                    <p className={cx(typography.smallMd, 'theme-text-primary')}>PCI-DSS Secured</p>
                </div>
            </div>
        )}
    />
);

export default BillingHeader;
