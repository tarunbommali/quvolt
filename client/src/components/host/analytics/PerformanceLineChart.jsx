import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useUIStore } from '../../../stores/useUIStore';
import { components } from '../../../styles/components';

const PerformanceLineChart = ({ data = [] }) => {
    const theme = useUIStore((state) => state.theme);
    const isDark = theme === 'dark';
    const axisColor = isDark ? '#9ca3af' : '#6b7280';
    const gridColor = isDark ? '#374151' : '#d1d5db';
    const tooltipStyle = {
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        border: `1px solid ${isDark ? '#4b5563' : '#e5e7eb'}`,
        color: isDark ? '#f3f4f6' : '#111827',
    };

    return (
        <div className={components.analytics.card}>
            <h3 className={components.analytics.sectionTitleUpper}>Performance Over Time</h3>
            <div className={components.analytics.chartHeightLg}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ left: 10, right: 10, top: 20, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="label" tick={{ fill: axisColor }} stroke={axisColor} />
                        <YAxis yAxisId="left" domain={[0, 100]} tick={{ fill: axisColor }} stroke={axisColor} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fill: axisColor }} stroke={axisColor} />
                        <Tooltip
                            contentStyle={tooltipStyle}
                            labelStyle={{ color: isDark ? '#e5e7eb' : '#374151' }}
                            itemStyle={{ color: isDark ? '#f3f4f6' : '#111827' }}
                        />
                        <Legend wrapperStyle={{ color: axisColor }} />
                        <Line yAxisId="left" type="monotone" dataKey="accuracy" stroke={isDark ? '#818cf8' : '#4f46e5'} strokeWidth={3} dot={false} name="Accuracy %" />
                        <Line yAxisId="right" type="monotone" dataKey="avgScore" stroke={isDark ? '#cbd5e1' : '#64748b'} strokeWidth={2} dot={false} name="Avg Score" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default PerformanceLineChart;
