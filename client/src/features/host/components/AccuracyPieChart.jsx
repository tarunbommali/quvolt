import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useUIStore } from '../../../stores/useUIStore';
import { components } from '../../../styles/index';

const COLORS = ['#16a34a', '#dc2626'];

const AccuracyPieChart = ({ correct = 0, wrong = 0 }) => {
    const theme = useUIStore((state) => state.theme);
    const isDark = theme === 'dark';

    const data = [
        { name: 'Correct', value: correct },
        { name: 'Wrong', value: wrong },
    ];

    return (
        <div className={components.analytics.cardCompact}>
            <h3 className={components.analytics.sectionTitleUpper}>Accuracy Split</h3>
            <div className={components.analytics.chartHeightMd}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={100}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                            labelLine={false}
                        >
                            {data.map((entry, index) => (
                                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                                border: `1px solid ${isDark ? '#4b5563' : '#e5e7eb'}`,
                                color: isDark ? '#f3f4f6' : '#111827',
                            }}
                            labelStyle={{ color: isDark ? '#e5e7eb' : '#374151' }}
                            itemStyle={{ color: isDark ? '#f3f4f6' : '#111827' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default AccuracyPieChart;

