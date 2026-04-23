import React from 'react';
import { Activity } from 'lucide-react';
import { motion as Motion } from 'framer-motion';

const LivePulseBadge = ({ count = 0, label = 'users live' }) => {
    return (
        <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm" aria-live="polite">
            <div className="relative flex items-center justify-center">
                <Motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute w-4 h-4 rounded-full bg-emerald-500" 
                />
                <div className="w-2 h-2 rounded-full bg-emerald-500 z-10" />
            </div>
            <Activity size={12} className="opacity-70" />
            <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-tighter tabular-nums">{count.toLocaleString('en-IN')}</span>
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">{label}</span>
            </div>
        </div>
    );
};

export default LivePulseBadge;
