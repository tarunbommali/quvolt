import React from 'react';
import { Search } from 'lucide-react';
import useAnalyticsStore from '../../../stores/useAnalyticsStore';

const StatusDot = ({ status }) => {
    const color =
        status === 'live'      ? 'bg-emerald-500 animate-pulse' :
        status === 'completed' ? 'bg-gray-400' :
        status === 'waiting'   ? 'bg-amber-400' : 'bg-gray-300';
    return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
};

const SessionListSidebar = () => {
    const { recentSessions, activeSessionId, setActiveSession } = useAnalyticsStore();

    return (
        <aside className="w-full lg:w-80 flex-shrink-0 flex flex-col h-[calc(100vh-140px)] border-r theme-border pr-0 lg:pr-6">
            <div className="pb-4">
                <h3 className="text-sm font-bold theme-text-primary uppercase tracking-widest mb-4">Sessions</h3>
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 theme-text-muted" />
                    <input 
                        type="text" 
                        placeholder="Search sessions..." 
                        className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-[var(--qb-primary)] rounded-xl py-2.5 pl-10 pr-4 text-sm theme-text-primary outline-none transition-colors"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {recentSessions.length === 0 && (
                    <p className="text-xs text-center theme-text-muted py-10">No sessions found.</p>
                )}
                {recentSessions.map((session) => {
                    const isActive = activeSessionId === session.sessionId;
                    return (
                        <button
                            key={session.sessionId}
                            onClick={() => setActiveSession(session.sessionId)}
                            className={`w-full text-left p-4 rounded-2xl transition-all border ${
                                isActive 
                                    ? 'bg-[var(--qb-primary)]/10 border-[var(--qb-primary)]/30' 
                                    : 'theme-surface border-transparent hover:border-black/10 dark:hover:border-white/10'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-1.5">
                                <StatusDot status={session.status} />
                                <span className={`text-sm font-bold truncate ${isActive ? 'text-[var(--qb-primary)]' : 'theme-text-primary'}`}>
                                    {session.title || 'Untitled Quiz'}
                                </span>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs font-medium theme-text-muted">
                                <span>{session.sessionCode}</span>
                                <span>·</span>
                                <span>
                                    {new Date(session.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                                <span>·</span>
                                <span>{session.participantCount} {session.participantCount === 1 ? 'user' : 'users'}</span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </aside>
    );
};

export default SessionListSidebar;
