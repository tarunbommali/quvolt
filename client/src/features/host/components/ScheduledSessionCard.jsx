import React from 'react';
import { Clock, CalendarClock, ExternalLink, Hash, ArrowRight } from 'lucide-react';
import { textStyles, components } from '../../../styles/index';

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
        <article
            className={`${components.analytics.card} !p-6 !rounded-[2rem] border theme-border space-y-5 transition-all duration-500 hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col`}
        >
            <div className="flex justify-between items-start">
                <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] border ${
                    isLive ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                    isAborted ? 'bg-gray-100 dark:bg-white/5 text-slate-400 border theme-border' :
                    'bg-amber-500/10 text-amber-600 border-amber-500/20'
                }`}>
                    {isLive ? 'Live Now' : isAborted ? 'Aborted' : isUpcoming ? 'Upcoming' : 'Completed'}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">
                    <Hash size={10} />
                    <span>{session.roomCode}</span>
                </div>
            </div>

            <div className="space-y-2 flex-1">
                <h3 className={textStyles.value2Xl + " !font-black !text-lg theme-text-primary line-clamp-2"}>{session.title}</h3>
                
                <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                            <CalendarClock size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Scheduled</p>
                            <p className="text-xs font-bold theme-text-primary truncate">{formatDateTime(session.scheduledAt)}</p>
                        </div>
                    </div>
                    
                    {isAborted && (
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                                <Clock size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-black uppercase tracking-widest text-red-400">Ended Early</p>
                                <p className="text-xs font-bold text-red-500 truncate">{session.lastSessionEndedAt ? formatDateTime(session.lastSessionEndedAt) : 'Session Interrupted'}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {(isLive || isUpcoming) && (
                <button
                    onClick={() => onJoin(session)}
                    className={`${components.button.base} ${components.button.sizes.md} ${
                        isLive ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20' : 
                        components.button.variants.secondary
                    } !rounded-xl w-full flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] h-12 group`}
                >
                    {isLive ? <Zap size={14} fill="currentColor" /> : <ArrowRight size={14} />}
                    <span>{isLive ? 'Join Live Room' : 'Open Lobby'}</span>
                </button>
            )}
        </article>
    );
};

export default ScheduledSessionCard;

