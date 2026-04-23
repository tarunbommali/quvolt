import { Calendar, Users, Activity, BarChart2, ChevronRight } from 'lucide-react';
import Card from '../../../components/common/ui/Card';

const StatusBadge = ({ status }) => {
    if (!status) return null;
    const isLive = status.toLowerCase() === 'live';
    const isCompleted = status.toLowerCase() === 'completed';
    
    if (isLive) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Now
            </span>
        );
    }
    
    if (isCompleted) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 text-gray-600 text-[10px] font-bold uppercase tracking-wider border border-gray-200">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                Completed
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wider border border-amber-100">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {status}
        </span>
    );
};

const HistoryRecordCard = ({ record, userRole, onNavigate, onPrefetch }) => {
    const participantCount = Number(record.participantCount ?? record.joinedParticipants ?? (userRole === 'participant' ? 1 : 0));
    const isTemplate = !record.sessionCode && !record.roomCode && record.type !== 'session';
    
    // Fallback labels for template view vs session view
    const code = record.sessionCode || record.roomCode;
    const avgScore = record.avgScore ? `${record.avgScore}%` : '--';

    return (
        <div
            onClick={() => onNavigate(record)}
            onMouseEnter={() => onPrefetch(record)}
            onFocus={() => onPrefetch(record)}
            className="group cursor-pointer bg-white border border-gray-200 hover:border-indigo-300 rounded-xl p-4 md:p-5 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md relative overflow-hidden"
        >
            {/* Left side: Name and meta */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold text-gray-900 truncate">
                        {record.quizTitle || record.title || 'Untitled'}
                    </h3>
                    {code && (
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-medium font-mono shrink-0">
                            {code}
                        </span>
                    )}
                    <StatusBadge status={record.status} />
                </div>
                
                <div className="flex items-center gap-5 text-sm text-gray-500 mt-1 font-medium">
                    <span className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-gray-400" />
                        {new Date(record.date || record.startedAt || record.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Users size={14} className="text-gray-400" />
                        {participantCount} {participantCount === 1 ? 'user' : 'users'}
                    </span>
                    {/* Only show avg score if it's a session (not a template) or if the record specifically provides it */}
                    {(!isTemplate || record.avgScore) && (
                        <span className="flex items-center gap-1.5 hidden md:flex">
                            <Activity size={14} className="text-gray-400" />
                            Avg Score: {avgScore}
                        </span>
                    )}
                </div>
            </div>

            {/* Right side: Action CTA */}
            <div className="flex items-center shrink-0 mt-2 md:mt-0">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(record);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                    <BarChart2 size={16} />
                    {isTemplate ? 'View Sessions' : 'View Analytics'}
                    <ChevronRight size={16} className="opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </button>
            </div>
        </div>
    );
};

export default HistoryRecordCard;
