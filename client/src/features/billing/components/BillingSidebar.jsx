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

    </div>
);

export default BillingSidebar;
