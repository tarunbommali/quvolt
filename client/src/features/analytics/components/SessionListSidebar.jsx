import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Search } from 'lucide-react';
import useAnalyticsStore from '../../../stores/useAnalyticsStore';
import { typography, layout, cx } from '../../../styles/index'

const StatusDot = ({ status }) => {
    const color =
        status === 'live' ? 'bg-emerald-500 animate-pulse' :
            status === 'completed' ? 'bg-slate-400' :
                status === 'waiting' ? 'bg-amber-400' : 'bg-slate-300';
    return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
};

const SessionListSidebar = () => {
    const { recentSessions, activeSessionId, setActiveSession } = useAnalyticsStore();

    return (
        <aside className="w-full lg:w-80 flex-shrink-0 flex flex-col h-[calc(100vh-140px)] border-r theme-border pr-0 lg:pr-6">
            <div className="pb-4">
                <h3 className={typography.metaLabel + " mb-4 !theme-text-primary"}>Sessions</h3>
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 theme-text-muted" />
                    <input
                        type="text"
                        placeholder="Search sessions..."
                        className="w-full bg-slate-50 dark:bg-white/5 border border-transparent focus:border-[var(--qb-primary)] rounded-xl h-10 pl-10 pr-4 text-sm font-medium theme-text-primary outline-none transition-colors"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {recentSessions.length === 0 && (
                    <p className={cx(typography.small, "text-center py-10 opacity-70")}>No sessions found.</p>
                )}
                {recentSessions.map((session, idx) => {
                    const isActive = activeSessionId === session.sessionId;
                    return (
                        <Motion.button
                            key={session.sessionId}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setActiveSession(session.sessionId)}
                            className={cx(
                                "w-full text-left p-4 rounded-xl transition-all border block",
                                isActive
                                    ? "bg-[var(--qb-primary)]/5 border-[var(--qb-primary)]/30"
                                    : "theme-surface border-transparent hover:border-slate-200 dark:hover:border-slate-800"
                            )}
                        >
                            <div className={cx(layout.rowStart, "mb-1.5")}>
                                <StatusDot status={session.status} />
                                <span className={cx(typography.bodyStrong, "truncate ml-2", isActive && "!text-[var(--qb-primary)]")}>
                                    {session.title || 'Untitled Quiz'}
                                </span>
                            </div>

                            <div className={cx(layout.rowBetween, typography.micro, "font-semibold")}>
                                <span>{session.sessionCode}</span>
                                <span className="opacity-40">•</span>
                                <span>
                                    {new Date(session.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                                <span className="opacity-40">•</span>
                                <span>{session.participantCount} users</span>
                            </div>
                        </Motion.button>
                    );
                })}
            </div>
        </aside>
    );
};

export default SessionListSidebar;
