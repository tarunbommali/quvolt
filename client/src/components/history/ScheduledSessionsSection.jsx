import { CalendarClock } from 'lucide-react';
import ScheduledSessionCard from './ScheduledSessionCard';

const ScheduledSessionsSection = ({ sessions, onJoin }) => (
    <div className="space-y-4">
        <div className="flex items-center gap-3">
            <CalendarClock size={18} className="text-violet-600" />
            <h2 className="text-lg font-black text-slate-900 uppercase">Upcoming Scheduled Sessions</h2>
            <span className="ui-chip bg-violet-100 text-violet-600">
                {sessions.filter((s) => s.status !== 'completed').length} registered
            </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sessions.map((session) => (
                <ScheduledSessionCard key={session.quizId} session={session} onJoin={onJoin} />
            ))}
        </div>
    </div>
);

export default ScheduledSessionsSection;
