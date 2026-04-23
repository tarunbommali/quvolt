import React from 'react';
import { Users, TrendingUp, UserCheck, Timer, MousePointer2 } from 'lucide-react';
import { cards, typography, layout, cx } from '../../../styles/index';

const AudienceInsights = ({ data = {} }) => {
    const { retentionRate = 0, peakParticipants = 0 } = data;

    const engagementMetrics = [
        { 
            label: 'Retention Rate', 
            val: retentionRate > 0 ? `${retentionRate.toFixed(1)}%` : '---', 
            icon: TrendingUp, 
            colorClass: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20',
            desc: 'Participant persistence'
        },
        { 
            label: 'Peak Concurrency', 
            val: peakParticipants > 0 ? peakParticipants.toLocaleString() : '---', 
            icon: Users, 
            colorClass: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
            desc: 'Simultaneous active nodes'
        },
        { 
            label: 'Avg Engagement', 
            val: 'High', 
            icon: MousePointer2, 
            colorClass: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
            desc: 'Active interaction'
        },
        { 
            label: 'Sync Status', 
            val: 'Global', 
            icon: UserCheck, 
            colorClass: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
            desc: 'Distributed sync'
        }
    ];

    return (
        <div className="space-y-6">
            <div className={layout.grid4}>
                {engagementMetrics.map((m, i) => (
                    <div key={i} className={cx(cards.metric, "hover:border-[var(--qb-primary)]/20 transition-colors group relative overflow-hidden")}>
                        <div className={cx("absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-transform group-hover:scale-110", m.colorClass.split(' ')[0])}>
                            <m.icon size={64} strokeWidth={1} />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <div className={cx("w-8 h-8 rounded-lg flex items-center justify-center", m.colorClass)}>
                                <m.icon size={16} />
                            </div>
                            <div>
                                <p className={typography.metaLabel}>{m.label}</p>
                                <p className={typography.metricMd}>{m.val}</p>
                            </div>
                            <p className={typography.small}>{m.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Engagement Timeline Card */}
            <div className={cx(cards.default, "flex flex-col md:flex-row items-center justify-between gap-6 bg-[var(--qb-primary)]/[0.02] border-[var(--qb-primary)]/10")}>
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--qb-primary)] text-white flex items-center justify-center shadow-lg shadow-[var(--qb-primary)]/20 shrink-0">
                        <Timer size={24} />
                    </div>
                    <div>
                        <h4 className={typography.h3}>Active Pulse Monitoring</h4>
                        <p className={typography.small}>Real-time participant behavior is synchronized across the global edge network.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-28 bg-[var(--qb-primary)]/10 rounded-lg flex items-center justify-center border border-[var(--qb-primary)]/20">
                        <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                                <div 
                                    key={i} 
                                    className="w-1 bg-[var(--qb-primary)] rounded-full animate-pulse" 
                                    style={{ 
                                        height: `${30 + Math.random() * 50}%`,
                                        animationDelay: `${i * 0.15}s`
                                    }} 
                                />
                            ))}
                        </div>
                    </div>
                    <span className={cx(typography.micro, "text-[var(--qb-primary)]")}>Active</span>
                </div>
            </div>
        </div>
    );
};

export default AudienceInsights;
