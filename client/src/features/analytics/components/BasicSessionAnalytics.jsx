import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Layout, Users, Target, Trophy, Clock } from 'lucide-react';

/**
 * BasicSessionAnalytics
 * Renders basic per-session metrics from the SessionAnalytics document.
 * All data comes from props — zero hardcoded mock values.
 *
 * Props:
 *   summary    {object}  - data from GET /api/analytics/session/:id
 *   leaderboard {array}  - topLeaderboard from session analytics
 */
const BasicSessionAnalytics = ({ summary = {}, leaderboard = [] }) => {
    const navigate = useNavigate();
    const { sessionId } = useParams();
    const avgScore          = Number(summary.avgScore          || 0);
    const completionRate    = Number(summary.completionRate    || 0);
    const totalParticipants = Number(summary.totalParticipants || 0);
    const totalResponses    = Number(summary.totalResponses    || 0);
    const accuracyPercent   = Number(summary.accuracyPercent   || 0);
    const sessionDuration   = Number(summary.sessionDuration   || 0);

    const hasData = totalParticipants > 0 || totalResponses > 0;

    const chartData = [
        { name: 'Avg. Score',   value: avgScore,          icon: Target, color: '#6366f1' },
        { name: 'Completion %', value: completionRate,    icon: Layout, color: '#10b981' },
        { name: 'Participants', value: totalParticipants, icon: Users,  color: '#f59e0b' },
    ];

    return (
        <div className="space-y-8">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {chartData.map((item) => (
                    <div key={item.name} className="theme-surface border theme-border p-6 rounded-[2.5rem] relative overflow-hidden group hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <item.icon size={80} />
                        </div>
                        <div className="relative z-10 space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] theme-text-muted">{item.name}</p>
                            <div className="flex items-baseline gap-1">
                                <h3 className="text-4xl font-black theme-text-primary tabular-nums">
                                    {hasData ? item.value.toFixed(item.name.includes('%') ? 1 : 0) : '—'}
                                </h3>
                                {item.name.includes('%') && hasData && (
                                    <span className="text-sm font-black theme-text-muted">%</span>
                                )}
                            </div>
                        </div>
                        <div
                            className="absolute bottom-0 left-0 h-1.5 w-full bg-gradient-to-r from-transparent via-current to-transparent opacity-30"
                            style={{ color: item.color }}
                        />
                    </div>
                ))}

                {/* Accuracy tile */}
                <div className="theme-surface border theme-border p-6 rounded-[2.5rem] relative overflow-hidden group hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Target size={80} />
                    </div>
                    <div className="relative z-10 space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] theme-text-muted">Accuracy</p>
                        <div className="flex items-baseline gap-1">
                            <h3 className="text-4xl font-black theme-text-primary tabular-nums">
                                {hasData ? accuracyPercent.toFixed(1) : '—'}
                            </h3>
                            {hasData && <span className="text-sm font-black theme-text-muted">%</span>}
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 h-1.5 w-full bg-gradient-to-r from-transparent via-current to-transparent opacity-30" style={{ color: '#06b6d4' }} />
                </div>
            </div>

            {/* Duration + Responses row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="theme-surface border theme-border p-6 rounded-3xl flex items-center justify-between group hover:border-indigo-500/30 transition-colors">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shadow-inner">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest theme-text-muted">Session Duration</p>
                            <p className="text-xl font-black theme-text-primary">
                                {hasData
                                    ? `${Math.floor(sessionDuration / 60)}m ${sessionDuration % 60}s`
                                    : '—'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="theme-surface border theme-border p-6 rounded-3xl flex items-center justify-between group hover:border-emerald-500/30 transition-colors">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-inner">
                            <Target size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest theme-text-muted">Total Responses</p>
                            <p className="text-xl font-black theme-text-primary">
                                {hasData ? totalResponses.toLocaleString() : '—'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Bar Chart */}
                <div className="theme-surface border theme-border rounded-[2.5rem] p-8 space-y-8">
                    <h3 className="text-xs font-black theme-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                        <Target size={18} className="text-indigo-500" />
                        Performance Overview
                    </h3>
                    {!hasData ? (
                        <div className="h-[250px] flex items-center justify-center">
                            <p className="text-xs theme-text-muted font-bold">No data yet — run a session first</p>
                        </div>
                    ) : (
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 800 }}
                                    />
                                    <YAxis hide />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                        contentStyle={{ borderRadius: '20px', border: 'none', fontSize: '12px', fontWeight: 700, backgroundColor: 'var(--qb-surface)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={48}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Top Leaderboard — real data from session */}
                <div className="theme-surface border theme-border rounded-[2.5rem] p-8 space-y-8">
                    <h3 className="text-xs font-black theme-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                        <Trophy size={18} className="text-amber-500" />
                        Top Performers
                    </h3>
                    {leaderboard.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[180px] gap-4">
                            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                                <Trophy size={32} />
                            </div>
                            <p className="text-xs theme-text-muted font-bold text-center max-w-[200px]">
                                {hasData
                                    ? 'No leaderboard recorded for this session'
                                    : 'Select a completed session to view rankings'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {leaderboard.slice(0, 10).map((entry, idx) => (
                                <div
                                    key={entry.userId || idx}
                                    onClick={() => entry.userId && navigate(`/history/${sessionId}/participant/${entry.userId}`)}
                                    className="flex items-center justify-between p-4 rounded-2xl bg-[var(--qb-background)] border theme-border hover:border-[var(--qb-primary)]/50 transition-all group cursor-pointer"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black shadow-sm ${
                                            idx === 0 ? 'bg-amber-500 text-white' :
                                            idx === 1 ? 'bg-gray-300 text-gray-800' :
                                            idx === 2 ? 'bg-orange-400 text-white' :
                                            'bg-gray-100 dark:bg-gray-800 theme-text-muted'
                                        }`}>
                                            {idx + 1}
                                        </div>
                                        <span className="text-sm font-bold theme-text-primary group-hover:theme-text-primary transition-colors">{entry.name || 'Unknown'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-black theme-text-primary">{entry.score ?? 0}</span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider theme-text-muted">pts</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BasicSessionAnalytics;
