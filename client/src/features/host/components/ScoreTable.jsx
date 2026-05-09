import React from 'react';
import { typography, cx } from '../../../styles/index';

/**
 * ScoreTable — Matrix-style leaderboard for Folder Blitz.
 * 
 * @param {Array} data - Transformed matrix data (from buildScoreMatrix)
 * @param {Array} units - List of units (subjects) in the folder
 */
const ScoreTable = ({ data, units }) => {
    if (!data || data.length === 0) {
        return (
            <div className="text-center py-24 theme-text-secondary opacity-40 italic text-sm">
                No participants have joined this blitz yet.
            </div>
        );
    }

    return (
        <div className="rounded-2xl border theme-border overflow-hidden theme-surface shadow-sm transition-all duration-300">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50 dark:bg-white/5">
                        <tr>
                            <th className={cx(
                                typography.tableHeader,
                                "p-4 border-b theme-border sticky left-0 bg-slate-50 dark:bg-[#1e293b] z-10 min-w-[200px]"
                            )}>
                                Participant
                            </th>

                            {units.map(unit => (
                                <th key={unit._id} className={cx(
                                    typography.tableHeader,
                                    "p-4 border-b theme-border text-center whitespace-nowrap min-w-[120px]"
                                )}>
                                    {unit.title || unit.name}
                                </th>
                            ))}

                            <th className={cx(
                                typography.tableHeader,
                                "p-4 border-b theme-border text-center whitespace-nowrap bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 font-bold"
                            )}>
                                Total
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-y theme-divide">
                        {data.map(user => (
                            <tr key={user.userId} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                                <td className="p-4 sticky left-0 theme-surface z-10 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40">
                                    <div className="flex items-center gap-3">
                                        {user.profilePhoto ? (
                                            <img 
                                                src={user.profilePhoto} 
                                                alt="" 
                                                className="w-8 h-8 rounded-full object-cover border theme-border"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase">
                                                {user.name?.charAt(0) || user.email?.charAt(0)}
                                            </div>
                                        )}
                                        <div className="flex flex-col min-w-0">
                                            <span className={cx(typography.bodyStrong, "truncate")}>{user.name || 'Anonymous'}</span>
                                            <span className={cx(typography.micro, "truncate")}>{user.email}</span>
                                        </div>
                                    </div>
                                </td>

                                {units.map(unit => {
                                    const score = user.units[unit._id] || 0;
                                    return (
                                        <td key={unit._id} className="p-4 text-center">
                                            <span className={cx(
                                                score > 0 ? typography.bodyStrong : "theme-text-muted opacity-30",
                                                "text-sm"
                                            )}>
                                                {score > 0 ? score : '—'}
                                            </span>
                                        </td>
                                    );
                                })}

                                <td className="p-4 text-center">
                                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                        {user.total}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ScoreTable;
