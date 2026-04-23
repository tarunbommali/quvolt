import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, Trophy, Clock, Activity, Medal, Zap } from 'lucide-react';
import { cards, typography, layout, cx } from '../../../styles/index'

const BasicSessionAnalytics = ({ summary = {}, leaderboard = [] }) => {
    const navigate = useNavigate();
    const { sessionId } = useParams();

    const avgScore = Number(summary.avgScore || 0);
    const completionRate = Number(summary.completionRate || 0);
    const totalParticipants = Number(summary.totalParticipants || 0);
    const totalResponses = Number(summary.totalResponses || 0);
    const accuracyPercent = Number(summary.accuracyPercent || 0);
    const sessionDuration = Number(summary.sessionDuration || 0);

    const hasData = totalParticipants > 0 || totalResponses > 0;

    const chartData = [
        { name: 'Avg. Score', value: avgScore, color: '#6366f1' },
        { name: 'Completion %', value: completionRate, color: '#10b981' },
        { name: 'Accuracy %', value: accuracyPercent, color: '#f59e0b' },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* ── Performance Matrix ── */}
                <div className={cx(cards.default, 'lg:col-span-7 space-y-6 flex flex-col')}>
                    <div className={layout.rowBetween}>
                        <div>
                            <h3 className={typography.h2}>Performance Matrix</h3>
                            <p className={typography.small}>Aggregate session intelligence metrics.</p>
                        </div>
                        <div className="px-2.5 py-1 rounded-md bg-[var(--qb-primary)]/10 text-[var(--qb-primary)] text-[10px] font-bold uppercase tracking-wider border border-[var(--qb-primary)]/20">
                            Synced
                        </div>
                    </div>

                    {!hasData ? (
                        <div className={cx(cards.empty, 'flex-1 flex flex-col items-center justify-center gap-3 min-h-[300px]')}>
                            <Activity className="text-slate-300 dark:text-slate-700" size={32} />
                            <p className={typography.small}>Awaiting session completion</p>
                        </div>
                    ) : (
                        <div className="h-[240px] -mx-4 mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--qb-border)" strokeOpacity={0.5} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: 'var(--qb-text-muted)', fontWeight: 500 }}
                                        dy={10}
                                    />
                                    <YAxis hide />
                                    <Tooltip
                                        cursor={{ fill: 'var(--qb-surface-soft)' }}
                                        contentStyle={{ borderRadius: '12px', border: '1px solid var(--qb-border)', fontSize: '12px', fontWeight: 600, backgroundColor: 'var(--qb-surface)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={40}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <div className={cx(cards.divider, 'grid grid-cols-2 md:grid-cols-4 gap-4 mt-auto')}>
                        {[
                            { label: 'Total Resp', val: totalResponses.toLocaleString(), icon: Activity },
                            { label: 'Duration', val: `${Math.floor(sessionDuration / 60)}m ${sessionDuration % 60}s`, icon: Clock },
                            { label: 'Sync Rate', val: '99.9%', icon: Zap },
                            { label: 'Nodes', val: totalParticipants, icon: Users }
                        ].map((m, i) => (
                            <div key={i} className="space-y-1">
                                <p className={cx(typography.metaLabel, layout.rowStart, 'gap-1.5')}>
                                    <m.icon size={11} /> {m.label}
                                </p>
                                <p className={typography.bodyStrong}>{m.val}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Mastery Podium ── */}
                <div className={cx(cards.default, 'lg:col-span-5 space-y-6 flex flex-col')}>
                    <div className={layout.rowBetween}>
                        <div>
                            <h3 className={typography.h2}>Mastery Podium</h3>
                            <p className={typography.small}>Top performers and identity rankings.</p>
                        </div>
                        <Trophy size={20} className="text-amber-500" />
                    </div>

                    {leaderboard.length === 0 ? (
                        <div className={cx(cards.empty, 'flex-1 flex flex-col items-center justify-center gap-4 min-h-[300px]')}>
                            <div className="w-12 h-12 rounded-full theme-surface-soft flex items-center justify-center text-slate-400">
                                <Medal size={24} />
                            </div>
                            <p className={typography.small}>
                                Lobby data not yet synchronized
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2 flex-1 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                            {leaderboard.slice(0, 10).map((entry, idx) => (
                                <Motion.div
                                    key={entry.userId || idx}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => entry.userId && navigate(`/history/${sessionId}/participant/${entry.userId}`)}
                                    className={cx(
                                        cards.flat,
                                        'flex items-center justify-between hover:border-[var(--qb-primary)]/30 transition-all cursor-pointer group'
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cx(
                                            'w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold',
                                            idx === 0 ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' :
                                                idx === 1 ? 'bg-slate-100 text-slate-600 dark:bg-slate-800' :
                                                    idx === 2 ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20' :
                                                        'theme-surface-soft theme-text-muted'
                                        )}>
                                            {idx + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={cx(typography.bodyStrong, 'truncate max-w-[120px] group-hover:text-[var(--qb-primary)] transition-colors')}>
                                                {entry.name || 'Anonymous Node'}
                                            </p>
                                            <p className={typography.micro}>Verified</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={typography.metricSm}>{entry.score ?? 0}</p>
                                        <p className={typography.micro}>PTS</p>
                                    </div>
                                </Motion.div>
                            ))}
                        </div>
                    )}

                    <button className={cx(
                        'w-full h-10 rounded-xl theme-surface-soft border theme-border flex items-center justify-center gap-2 transition-all mt-auto',
                        typography.smallMd, 'hover:theme-text-primary hover:border-[var(--qb-primary)]/30'
                    )}>
                        View Full Ranking <Trophy size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BasicSessionAnalytics;
