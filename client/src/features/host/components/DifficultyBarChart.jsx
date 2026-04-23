import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useUIStore } from '../../../stores/useUIStore';
import { components } from '../../../styles/index';

const DifficultyBarChart = ({ data = [] }) => {
    const theme = useUIStore((state) => state.theme);
    const isDark = theme === 'dark';
    const axisColor = isDark ? '#9ca3af' : '#6b7280';
    const gridColor = isDark ? '#374151' : '#d1d5db';
    const tooltipStyle = {
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        border: `1px solid ${isDark ? '#4b5563' : '#e5e7eb'}`,
        color: isDark ? '#f3f4f6' : '#111827',
    };

    const chartData = data.map((item) => ({
        name: `Q${item.index || 0}`,
        difficulty: item.difficulty || 0,
        successRate: item.successRate || 0,
    }));

    return (
        <div className={components.analytics.card}>
            <h3 className={components.analytics.sectionTitleUpper}>Question Difficulty</h3>
            <div className={components.analytics.chartHeightLg}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ left: 10, right: 10, top: 20, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="name" tick={{ fill: axisColor }} stroke={axisColor} />
                        <YAxis domain={[0, 100]} tick={{ fill: axisColor }} stroke={axisColor} />
                        <Tooltip
                            contentStyle={tooltipStyle}
                            labelStyle={{ color: isDark ? '#e5e7eb' : '#374151' }}
                            itemStyle={{ color: isDark ? '#f3f4f6' : '#111827' }}
                        />
                        <Bar dataKey="difficulty" fill={isDark ? '#818cf8' : '#4f46e5'} radius={[8, 8, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default DifficultyBarChart;

