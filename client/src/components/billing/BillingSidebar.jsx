import { CircleAlert, ShieldCheck, Zap } from 'lucide-react';
import Card from '../ui/Card';

const BillingSidebar = ({ limitJoin, hostAccount, isOrganizer }) => (
    <div className="space-y-6">
        <Card className="relative overflow-hidden rounded-2xl border border-gray-200 bg-slate-900 p-4 md:p-6 text-white">
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <Zap size={100} />
            </div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-indigo-300">Live Analytics</h3>
            <p className="mb-1 text-2xl md:text-3xl font-semibold">{limitJoin}</p>
            <p className="text-sm font-medium text-slate-400">Max concurrent participants</p>
            <div className="mt-6 pt-6 border-t border-slate-700/50">
                <p className="text-sm text-slate-300 font-medium">
                    To increase limits and reduce platform commission rates to as low as 5%, upgrade your tier below.
                </p>
            </div>
        </Card>

        {isOrganizer && (
            <Card className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm">
                <div className="flex items-center gap-3">
                    {hostAccount?.accountStatus === 'active' ? (
                        <ShieldCheck className="text-emerald-600" size={20} />
                    ) : (
                        <CircleAlert className="text-amber-600" size={20} />
                    )}
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Account Readiness</h3>
                </div>
                <p className="text-lg font-semibold text-slate-900">
                    {hostAccount?.accountStatus === 'active' ? 'Payout-ready host account' : 'Action needed before settlement'}
                </p>
                <p className="text-sm text-slate-500 font-medium">
                    {hostAccount?.linkedAccountId
                        ? `Linked account: ${hostAccount.linkedAccountId}`
                        : 'No linked payout account found for this host.'}
                </p>
            </Card>
        )}
    </div>
);

export default BillingSidebar;
