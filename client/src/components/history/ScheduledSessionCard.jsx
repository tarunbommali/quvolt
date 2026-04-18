import { Clock, CalendarClock, ExternalLink } from 'lucide-react';
import Card from '../common/ui/Card';
import StatusBadge from '../common/ui/StatusBadge';

const DASH = '\u2014';

const formatDateTime = (value) => (
    value
        ? new Date(value).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        })
        : DASH
);

const ScheduledSessionCard = ({ session, onJoin }) => {
    const isUpcoming = session.status === 'upcoming' && new Date(session.scheduledAt) > new Date();
    const isLive = session.status === 'live' || session.status === 'ongoing';
    const isAborted = session.status === 'aborted';

    return (
        <Card
            className={`bg-white border-2 rounded-3xl p-5 space-y-3 shadow-sm transition-all ${isLive ? 'border-green-300 hover:border-green-400' :
                    isAborted ? 'border-red-200 hover:border-red-300' :
                        'border-violet-100 hover:border-violet-300'
                }`}
        >
            <div className="flex justify-between items-start">
                <StatusBadge status={isLive ? 'live' : isAborted ? 'aborted' : isUpcoming ? 'upcoming' : 'completed'} />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{session.roomCode}</span>
            </div>
            <h3 className="text-base font-black text-slate-900 leading-tight">{session.title}</h3>
            <div className="space-y-1 text-[11px] font-medium text-slate-500">
                <div className="flex items-center gap-1.5">
                    <CalendarClock size={11} className="text-violet-400" />
                    <span>Scheduled: <span className="font-bold text-slate-700">{formatDateTime(session.scheduledAt)}</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock size={11} className="text-indigo-400" />
                    <span>Registered: <span className="font-bold text-slate-700">{formatDateTime(session.joinedAt)}</span></span>
                </div>
                {isAborted && (
                    <div className="flex items-center gap-1.5">
                        <Clock size={11} className="text-red-400" />
                        <span>Ended: <span className="font-bold text-slate-700">{session.lastSessionEndedAt ? formatDateTime(session.lastSessionEndedAt) : 'Just now'}</span></span>
                    </div>
                )}
            </div>
            {session.message && (
                <div className={`rounded-2xl px-3 py-2 text-[11px] font-bold ${isAborted ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-slate-500'
                    }`}>
                    {session.message}
                </div>
            )}
            {(isLive || isUpcoming) && (
                <button
                    onClick={() => onJoin(session)}
                    className={`w-full py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${isLive
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-violet-50 hover:bg-violet-100 text-violet-700'
                        }`}
                >
                    <ExternalLink size={12} />
                    {isLive ? 'Join Now' : 'Enter Invite Room'}
                </button>
            )}
        </Card>
    );
};

export default ScheduledSessionCard;
