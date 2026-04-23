import React from 'react';
import { Calendar, Users, Activity, BarChart2, ChevronRight, Hash, ShieldCheck, Zap } from 'lucide-react';
import { typography, cards, buttonStyles, layout, cx } from '../../../styles/index';

const StatusBadge = ({ status }) => {
    if (!status) return null;
    const s = status.toLowerCase();
    
    if (s === 'live') {
        return (
            <div className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-600 border border-red-500/20 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className={typography.micro}>Live Now</span>
            </div>
        );
    }
    
    if (s === 'completed') {
        return (
            <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className={typography.micro}>Completed</span>
            </div>
        );
    }

    return (
        <div className={cx(cards.subtle, '!p-1 px-2.5 gap-1.5 flex items-center')}>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span className={typography.micro}>{status}</span>
        </div>
    );
};

const HistoryRecordCard = ({ record, userRole, onNavigate, onPrefetch }) => {
    const participantCount = Number(record.participantCount ?? record.joinedParticipants ?? (userRole === 'participant' ? 1 : 0));
    const isTemplate = !record.sessionCode && !record.roomCode && record.type !== 'session';
    const code = record.sessionCode || record.roomCode;
    const avgScore = record.avgScore ? `${record.avgScore}%` : '--';

    return (
        <article
            onClick={() => onNavigate(record)}
            onMouseEnter={() => onPrefetch(record)}
            onFocus={() => onPrefetch(record)}
            className={cx(cards.interactive, 'p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 group')}
        >
            <div className="flex flex-col gap-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-4">
                    <h3 className={cx(typography.h3, 'truncate')} title={record.quizTitle || record.title}>
                        {record.quizTitle || record.title || 'Untitled Session'}
                    </h3>
                    <div className="flex items-center gap-3">
                        {code && (
                            <div className={cx(cards.subtle, '!p-1 px-2.5 gap-1.5 flex items-center')}>
                                <Hash size={12} className="opacity-40" />
                                <span className={typography.micro}>{code}</span>
                            </div>
                        )}
                        <StatusBadge status={record.status} />
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="theme-text-muted" />
                        <span className={typography.metaLabel}>
                            {new Date(record.date || record.startedAt || record.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Users size={14} className="theme-text-muted" />
                        <span className={typography.metaLabel}>
                            {participantCount} {participantCount === 1 ? 'Participant' : 'Participants'}
                        </span>
                    </div>
                    {(!isTemplate || record.avgScore) && (
                        <div className="flex items-center gap-1.5">
                            <Activity size={14} className="theme-text-muted" />
                            <span className={typography.metaLabel}>Avg. Score: {avgScore}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center shrink-0">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(record);
                    }}
                    className={cx(buttonStyles.base, buttonStyles.secondary, buttonStyles.sizeSm, 'gap-2 group-hover:bg-[var(--qb-primary)] group-hover:text-white group-hover:border-[var(--qb-primary)]')}
                >
                    <BarChart2 size={14} />
                    <span>{isTemplate ? 'View Sessions' : 'View Analytics'}</span>
                    <ChevronRight size={14} className="opacity-40 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </article>
    );
};

export default HistoryRecordCard;

