import React from 'react';
import { motion as Motion } from 'framer-motion';
import { CircleAlert, ShieldCheck, Zap, Activity, Users, ArrowUpRight } from 'lucide-react';
import { textStyles, components } from '../../../styles/index';

const BillingSidebar = ({ limitJoin, hostAccount, ishost }) => (
    <div className="space-y-8 lg:sticky lg:top-8">
        <Motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className={`${components.analytics.card} relative overflow-hidden !rounded-[3rem] !p-10 group border theme-border shadow-2xl shadow-indigo-500/5`}
        >
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none group-hover:scale-110 duration-700">
                <Users size={160} />
            </div>

            <div className="flex items-center gap-3 mb-8">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                    <Activity size={14} />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] theme-text-primary">System Capacity</h3>
            </div>

            <div className="relative space-y-3">
                <p className="text-6xl font-black theme-text-primary tracking-tighter tabular-nums">
                    {Number(limitJoin || 0).toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                    <Users size={14} className="theme-text-muted" />
                    <p className="text-[11px] font-black theme-text-muted uppercase tracking-widest opacity-60">Max Concurrent Clients</p>
                </div>
            </div>

            <div className="mt-10 pt-8 border-t theme-border">
                <div className="p-5 rounded-[1.5rem] bg-indigo-500/5 border border-indigo-500/10 space-y-3">
                    <p className="text-[10px] font-bold theme-text-primary leading-relaxed uppercase tracking-wider">
                        Lower your fees to <span className="text-emerald-500 font-black">5%</span> and unlock advanced AI templates.
                    </p>
                    <div className="flex items-center gap-2 text-indigo-500 font-black text-[9px] uppercase tracking-widest">
                        <span>View Tier Benefits</span>
                        <ArrowUpRight size={12} />
                    </div>
                </div>
            </div>
        </Motion.div>

        {ishost && (
            <Motion.div 
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className={`${components.analytics.card} !rounded-[3rem] !p-10 space-y-8 border theme-border shadow-2xl shadow-emerald-500/5`}
            >
                <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                        hostAccount?.accountStatus === 'active' 
                            ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                            : 'bg-amber-500 text-white shadow-amber-500/20'
                    }`}>
                        {hostAccount?.accountStatus === 'active' ? (
                            <ShieldCheck size={28} />
                        ) : (
                            <CircleAlert size={28} />
                        )}
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] theme-text-muted opacity-60">Payout Integrity</h3>
                        <p className="text-lg font-black theme-text-primary mt-0.5 tracking-tight">
                            {hostAccount?.accountStatus === 'active' ? 'Account Verified' : 'Action Required'}
                        </p>
                    </div>
                </div>
                
                <div className="p-6 rounded-2xl bg-gray-50 dark:bg-white/5 border theme-border">
                    <p className="text-[10px] font-bold theme-text-muted leading-relaxed uppercase tracking-widest italic opacity-80">
                        {hostAccount?.linkedAccountId
                            ? `Destination: ${hostAccount.linkedAccountId.slice(0, 16)}...`
                            : 'Identity verification pending. Earnings held in secure escrow.'}
                    </p>
                </div>
            </Motion.div>
        )}
    </div>
);

export default BillingSidebar;
