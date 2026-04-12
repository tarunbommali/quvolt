import { memo } from 'react';
import { BarChart3, Clock3, Flame, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const BAR_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899'];

const AnswerDistributionCard = ({ currentQuestion, answerStats, fastestUser, participantCount = 0 }) => {
    const optionCounts = answerStats?.optionCounts || {};
    const options = currentQuestion?.options || [];
    const totalAnswers = answerStats?.totalAnswers || Object.values(optionCounts).reduce((sum, value) => sum + Number(value || 0), 0);

    const chartData = options.map((option, index) => ({
        name: option,
        count: Number(optionCounts[option] || 0),
        fill: BAR_COLORS[index % BAR_COLORS.length],
    }));

    return (
        <div className="qr-card p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-slate-900">
                        <BarChart3 className="text-indigo-600" size={18} />
                        <h3 className="qr-panel-title font-medium">Answer distribution</h3>
                    </div>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                        Live responses from {participantCount} participants
                    </p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-indigo-700">
                    <Users size={12} /> {totalAnswers} Answers
                </div>
            </div>

            {chartData.length > 0 ? (
                <div className="h-56 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} height={60} />
                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                            <Tooltip
                                cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
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
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-slate-500">
                    Answer bars will appear after the first responses arrive.
                </div>
            )}

            {fastestUser && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-3">
                    <Flame className="mt-0.5 text-amber-600" size={18} />
                    <div>
                        <p className="font-medium uppercase tracking-wide text-[11px]">Fastest responder</p>
                        <p className="mt-1 font-medium text-slate-900">
                            {fastestUser.name}{' '}
                            <span className="text-amber-700">({Number(fastestUser.timeTaken).toFixed(2)}s)</span>
                        </p>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                <Clock3 size={12} /> Updates in real time as answers are submitted
            </div>
        </div>
    );
};

export default memo(AnswerDistributionCard);