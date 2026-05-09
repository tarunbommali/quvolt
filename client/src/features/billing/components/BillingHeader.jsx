import React from 'react';
import BreadCrumbs from '../../../components/layout/BreadCrumbs';
const BillingHeader = () => (
    <BreadCrumbs
        breadcrumbs={[
            { label: 'Workspace', },
            { label: 'Billing' },
        ]}

    />
);

export default BillingHeader;
