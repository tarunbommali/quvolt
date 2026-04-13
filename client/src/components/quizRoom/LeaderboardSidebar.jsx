import { memo } from 'react';
import { Crown, Trophy } from 'lucide-react';

const LeaderboardSidebar = ({ leaderboard, fastestUser, currentUserId }) => {
    return (
        <div className="space-y-6 max-h-[35vh] lg:max-h-none overflow-y-auto w-full scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pr-2 pb-2">
            <div className="qr-card p-6">
                <h3 className="qr-panel-title flex items-center gap-3 mb-6 font-sans theme-text-primary">
                    <Trophy className="theme-tone-caution" /> Leaderboard
                </h3>
                <div className="space-y-4">
                    {leaderboard.map((entry, i) => {
                        const entryUserId = entry.userId || entry._id;
                        const isFastest = fastestUser && fastestUser.userId === entryUserId;
                        const isSelf = currentUserId && entryUserId === currentUserId;
                        const streak = Number(entry.streak || 0);

                        return (
                        <div
                            key={entry._id || entry.userId || `${entry.name}-${i}`}
                            className={`flex justify-between items-center p-4 rounded-2xl border ${
                                isFastest
                                    ? 'theme-status-warning'
                                    : i === 0
                                    ? 'theme-status-caution'
                                    : i === 1
                                    ? 'theme-surface-soft theme-border'
                                    : i === 2
                                    ? 'theme-status-warning'
                                    : 'theme-surface theme-border'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={`text-lg font-medium w-6 ${
                                    isFastest
                                        ? 'theme-tone-warning'
                                        : i === 0
                                        ? 'theme-tone-caution'
                                        : i === 1
                                        ? 'text-gray-400'
                                        : i === 2
                                        ? 'theme-tone-warning'
                                        : 'theme-text-muted'
                                }`}>
                                    {isFastest ? <Crown size={18} /> : `#${i + 1}`}
                                </span>
                                <div className="flex flex-col">
                                    <span className="font-medium theme-text-primary text-sm flex items-center gap-2">
                                        {entry.name}
                                        {isSelf && <span className="rounded-full bg-[color-mix(in_srgb,var(--qb-primary)_14%,var(--qb-surface-1))] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-(--qb-primary)">You</span>}
                                        {isFastest && <span className="rounded-full theme-status-warning px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">Fastest</span>}
                                    </span>
                                    {streak > 0 && (
                                        <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-600">
                                            Streak x{streak}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <span className="flex flex-col items-end gap-1 font-medium text-(--qb-primary) text-lg">
                                {entry.score}
                                {streak > 1 && (
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                                        {streak} streak
                                    </span>
                                )}
                            </span>
                        </div>
                        );
                    })}
                    {leaderboard.length === 0 && (
                        <p className="qr-empty">
                            No scores yet...
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default memo(LeaderboardSidebar);
