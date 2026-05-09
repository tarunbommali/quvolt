import { memo } from 'react';
import { BarChart3, Clock3, Flame, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useUIStore } from '../../../stores/useUIStore';
import { typography, cards, cx } from '../../../styles/index';

const LIGHT_BAR_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899'];
const DARK_BAR_COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f472b6'];

const AnswerDistributionCard = ({ currentQuestion, answerStats, fastestUser, participantCount = 0 }) => {
    const theme = useUIStore((state) => state.theme);
    const isDark = theme === 'dark';

    const optionCounts = answerStats?.optionCounts || {};
    const options = currentQuestion?.options || [];
    const totalAnswers = answerStats?.totalAnswers || Object.values(optionCounts).reduce((sum, value) => sum + Number(value || 0), 0);
    const chartColors = isDark ? DARK_BAR_COLORS : LIGHT_BAR_COLORS;

    const chartData = options.map((option, index) => ({
        name: option,
        count: Number(optionCounts[option] || 0),
        fill: chartColors[index % chartColors.length],
    }));

    const axisTickColor = isDark ? '#94a3b8' : '#64748b';
    const gridStrokeColor = isDark ? 'rgba(148, 163, 184, 0.24)' : 'rgba(100, 116, 139, 0.26)';
    const tooltipCursorColor = isDark ? 'rgba(129, 140, 248, 0.18)' : 'rgba(99, 102, 241, 0.08)';
    const tooltipContentStyle = {
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        borderRadius: '12px',
        color: isDark ? '#e2e8f0' : '#0f172a',
    };

    return (
        <div className={cx(cards.base, "p-8 space-y-6 !rounded-[2.5rem]")}>
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 theme-text-primary">
                        <BarChart3 className="text-indigo-500" size={18} />
                        <h3 className={typography.h3}>Answer Distribution</h3>
                    </div>
                    <p className={typography.micro}>
                        Live responses from {participantCount} participants
                    </p>
                </div>
                <div className={cx(typography.micro, "flex items-center gap-2 rounded-full bg-indigo-500/10 px-4 py-1.5 text-indigo-500 border border-indigo-500/20")}>
                    <Users size={12} /> {totalAnswers} Answers
                </div>
            </div>

            {chartData.length > 0 ? (
                <div className="h-56 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid stroke={gridStrokeColor} strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: axisTickColor, fontSize: 12 }} tickLine={false} axisLine={false} interval={0} height={60} />
                            <YAxis allowDecimals={false} tick={{ fill: axisTickColor, fontSize: 12 }} tickLine={false} axisLine={false} />
                            <Tooltip
                                cursor={{ fill: tooltipCursorColor }}
                                contentStyle={tooltipContentStyle}
                                labelStyle={{ color: isDark ? '#e2e8f0' : '#0f172a', fontWeight: 600 }}
                                itemStyle={{ color: isDark ? '#cbd5e1' : '#334155' }}
                                formatter={(value) => [value, 'Votes']}
                            />
                            <Bar dataKey="count" radius={[12, 12, 0, 0]}>
                                {chartData.map((entry) => (
                                    <Cell key={entry.name} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed theme-border theme-surface-soft p-6 text-sm theme-text-muted">
                    Answer bars will appear after the first responses arrive.
                </div>
            )}

            {fastestUser && (
                <div className="rounded-2xl bg-amber-500/5 border border-amber-500/20 p-4 flex items-start gap-3">
                    <Flame className="mt-0.5 text-amber-500" size={18} />
                    <div className="space-y-0.5">
                        <p className={typography.micro + " !text-amber-600"}>Fastest Responder</p>
                        <p className={typography.bodyStrong}>
                            {fastestUser.name}{' '}
                            <span className="text-amber-500">({Number(fastestUser.timeTaken).toFixed(2)}s)</span>
                        </p>
                    </div>
                </div>
            )}

            <div className={cx(typography.micro, "flex items-center gap-2 !tracking-normal")}>
                <Clock3 size={12} /> Updates in real time as answers are submitted
            </div>
        </div>
    );
};

export default memo(AnswerDistributionCard);

