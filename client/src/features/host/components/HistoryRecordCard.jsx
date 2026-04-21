import { Calendar, Users } from 'lucide-react';
import Card from '../../../components/common/ui/Card';

const cardClass = 'bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition space-y-3';

const HistoryRecordCard = ({ record, userRole, onNavigate, onPrefetch }) => {
    const participantCount = Number(record.participantCount ?? (userRole === 'participant' ? 1 : 0));
    const participantLabel = participantCount === 1 ? 'participant' : 'participants';

    return (
        <Card
            onClick={() => onNavigate(record)}
            onMouseEnter={() => onPrefetch(record)}
            onFocus={() => onPrefetch(record)}
            className={`${cardClass} cursor-pointer`}
        >
            <div className="flex items-start justify-between gap-3">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 truncate">
                    {record.quizTitle || record.title}
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">
                    {record.roomCode || 'N/A'}
                </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                    <Calendar size={13} className="text-gray-400" />
                    {new Date(record.date || record.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <Users size={13} className="text-gray-400" />
                    {participantCount} {participantLabel}
                </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onNavigate(record);
                    }}
                    className="text-sm font-medium text-indigo-600 hover:underline"
                >
                    View Details -&gt;
                </button>
            </div>
        </Card>
    );
};

export default HistoryRecordCard;

