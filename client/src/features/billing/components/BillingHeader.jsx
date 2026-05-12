import React from 'react';
import PageHeader from '../../../components/layout/PageHeader';
const BillingHeader = () => (
    <PageHeader
        breadcrumbs={[
            { label: 'Workspace', },
            { label: 'Billing' },
        ]}

    />
);

export default BillingHeader;
