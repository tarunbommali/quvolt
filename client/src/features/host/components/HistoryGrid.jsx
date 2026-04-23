import ViewportPrefetch from '../../../components/common/ViewportPrefetch';
import HistoryRecordCard from './HistoryRecordCard';

const HistoryGrid = ({ records, userRole, onNavigate, onOpenLeaderboard, onPrefetch }) => (
    <div className="flex flex-col gap-3">
        {records.map((record, i) => (
            <ViewportPrefetch key={record.roomCode || record._id || i} onPrefetch={() => onPrefetch(record)}>
                <HistoryRecordCard
                    record={record}
                    userRole={userRole}
                    onNavigate={onNavigate}
                    onOpenLeaderboard={onOpenLeaderboard}
                    onPrefetch={onPrefetch}
                />
            </ViewportPrefetch>
        ))}
    </div>
);

export default HistoryGrid;

