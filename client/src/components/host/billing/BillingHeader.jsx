import { CreditCard } from 'lucide-react';

const BillingHeader = () => (
    <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
            <CreditCard size={32} className="text-indigo-600" /> Billing & Usage
        </h1>
        <p className="page-subtitle">Manage your subscription plan, billing details, and payment history.</p>
    </div>
);

export default BillingHeader;
