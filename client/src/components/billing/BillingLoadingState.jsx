import { Loader2 } from 'lucide-react';

const BillingLoadingState = () => (
    <div className="flex flex-col items-center justify-center p-20 text-slate-400 dark:text-gray-500">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading plans...</p>
    </div>
);

export default BillingLoadingState;
