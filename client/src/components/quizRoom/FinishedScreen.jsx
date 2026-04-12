import { memo } from 'react';
import { Trophy } from 'lucide-react';

const FinishedScreen = ({ leaderboard }) => {
    return (
        <div className="qr-page max-w-4xl text-center space-y-12 animate-in zoom-in duration-700">
            <div className="space-y-4">
                <h1 className="page-title text-indigo-600 text-3xl md:text-4xl tracking-tight font-medium">
                    Quiz complete
                </h1>
                <p className="text-slate-500 text-lg font-medium">Final standings</p>
            </div>

            <div className="qr-card rounded-xl p-10 space-y-8 relative overflow-hidden border border-gray-100">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-indigo-200" />
                <h2 className="text-2xl font-medium flex items-center justify-center gap-3 text-slate-900">
                    <Trophy className="text-yellow-500" size={32} /> Top Participants
                </h2>
                <div className="space-y-4">
                    {leaderboard.map((entry, i) => (
                        <div
                            key={entry._id || entry.userId || `${entry.name}-${i}`}
                            className={`flex justify-between items-center p-6 rounded-2xl ${
                                i === 0
                                    ? 'bg-yellow-50 border border-yellow-300'
                                    : 'bg-gray-50 border border-gray-100'
                            }`}
                        >
                            <div className="flex items-center gap-6">
                                <span className={`text-2xl font-medium w-10 ${
                                    i === 0 ? 'text-yellow-500' : 'text-slate-400'
                                }`}>
                                    {i + 1}
                                </span>
                                <span className="font-medium text-xl tracking-tight text-slate-900">
                                    {entry.name}
                                </span>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-medium text-indigo-600">{entry.score}</p>
                                <p className="text-xs text-slate-400 font-medium">
                                    {entry.time?.toFixed(2)}s response
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default memo(FinishedScreen);
