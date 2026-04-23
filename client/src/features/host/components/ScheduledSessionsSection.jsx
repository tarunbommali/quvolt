import React from 'react';
import { CalendarClock } from 'lucide-react';
import ScheduledSessionCard from './ScheduledSessionCard';
import { textStyles } from '../../../styles/index';

const ScheduledSessionsSection = ({ sessions, onJoin }) => (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <CalendarClock size={20} />
            </div>
            <div className="flex-1">
                <h2 className={textStyles.value2Xl + " !font-black !text-xl"}>Upcoming Scheduled Sessions</h2>
                <p className={textStyles.tinyMuted + " font-bold"}>{sessions.filter((s) => s.status !== 'completed').length} sessions registered</p>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sessions.map((session) => (
                <ScheduledSessionCard key={session.quizId || session._id} session={session} onJoin={onJoin} />
            ))}
        </div>
    </div>
);

export default ScheduledSessionsSection;

