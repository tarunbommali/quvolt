import React from 'react';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';
import { Smartphone, Monitor, Tablet, Users, TrendingUp } from 'lucide-react';

/**
 * AudienceInsights
 * Renders real audience data from GET /api/analytics/audience/:sessionId.
 *
 * Props:
 *   data {object} - AudienceAnalytics document shape:
 *     { deviceBreakdown: { mobile, desktop, tablet }, participationTimeline: [{label, count}], retentionRate, peakParticipants }
 */
const AudienceInsights = ({ data = {} }) => {
    const { deviceBreakdown = {}, participationTimeline = [], retentionRate = 0, peakParticipants = 0 } = data;

    const total = (deviceBreakdown.mobile || 0) + (deviceBreakdown.desktop || 0) + (deviceBreakdown.tablet || 0);
    const pct = (n) => (total > 0 ? Number(((n / total) * 100).toFixed(1)) : 0);

    const deviceData = [
        { name: 'Mobile',  value: pct(deviceBreakdown.mobile  || 0), raw: deviceBreakdown.mobile  || 0, color: '#6366f1', icon: Smartphone },
        { name: 'Desktop', value: pct(deviceBreakdown.desktop || 0), raw: deviceBreakdown.desktop || 0, color: '#06b6d4', icon: Monitor },
        { name: 'Tablet',  value: pct(deviceBreakdown.tablet  || 0), raw: deviceBreakdown.tablet  || 0, color: '#8b5cf6', icon: Tablet },
    ];

    const hasDeviceData  = total > 0;
    const hasTrend       = participationTimeline.length > 0;

    return (
        <div className="space-y-6">
            {/* Summary pills */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="theme-surface border theme-border p-6 rounded-3xl flex items-center justify-between group hover:border-indigo-500/30 transition-colors">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shadow-inner">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest theme-text-muted">Retention Rate</p>
                            <p className="text-xl font-black theme-text-primary">
                                {retentionRate > 0 ? `${retentionRate.toFixed(1)}%` : '—'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="theme-surface border theme-border p-6 rounded-3xl flex items-center justify-between group hover:border-amber-500/30 transition-colors">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-inner">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest theme-text-muted">Peak Participants</p>
                            <p className="text-xl font-black theme-text-primary">
                                {peakParticipants > 0 ? peakParticipants.toLocaleString() : '—'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Device Breakdown */}
                <div className="theme-surface border theme-border rounded-[2.5rem] p-8 space-y-8">
                    <h3 className="text-xs font-black theme-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                        <Smartphone size={18} className="text-indigo-500" />
                        Device Distribution
                    </h3>

                    {!hasDeviceData ? (
                        <div className="flex items-center justify-center h-[200px]">
                            <p className="text-xs theme-text-muted font-bold">No device data available for this session</p>
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row items-center gap-12">
                            <div className="w-[200px] h-[200px] shrink-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={deviceData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={65}
                                            outerRadius={85}
                                            paddingAngle={10}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {deviceData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '20px',
                                                border: 'none',
                                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                backgroundColor: 'var(--qb-surface)'
                                            }}
                                            formatter={(value) => [`${value}%`, '']}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="flex-1 space-y-3 w-full">
                                {deviceData.map((device) => (
                                    <div
                                        key={device.name}
                                        className="flex items-center justify-between p-4 rounded-2xl bg-[var(--qb-background)] border theme-border group hover:border-[var(--qb-primary)]/50 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: `${device.color}15`, color: device.color }}>
                                                <device.icon size={16} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black theme-text-primary uppercase tracking-wider">{device.name}</p>
                                                <p className="text-[10px] font-bold theme-text-muted">{device.raw} users</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-black theme-text-primary">{device.value}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Participation Timeline */}
                <div className="theme-surface border theme-border rounded-[2.5rem] p-8 space-y-8">
                    <h3 className="text-xs font-black theme-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                        <TrendingUp size={18} className="text-emerald-500" />
                        Participation Timeline
                    </h3>

                    {!hasTrend ? (
                        <div className="flex items-center justify-center h-[250px]">
                            <p className="text-xs theme-text-muted font-bold">No participation timeline data available</p>
                        </div>
                    ) : (
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={participationTimeline}>
                                    <defs>
                                        <linearGradient id="colorPart" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="var(--qb-primary)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--qb-primary)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis
                                        dataKey="label"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 800 }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 800 }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '20px',
                                            border: 'none',
                                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            backgroundColor: 'var(--qb-surface)'
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="var(--qb-primary)"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorPart)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AudienceInsights;
