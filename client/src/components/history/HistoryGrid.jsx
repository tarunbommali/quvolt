import ViewportPrefetch from '../common/ViewportPrefetch';
import HistoryRecordCard from './HistoryRecordCard';

const HistoryGrid = ({ records, userRole, onNavigate, onOpenLeaderboard, onPrefetch }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {records.map((record, i) => (
            <ViewportPrefetch key={record.roomCode || i} onPrefetch={() => onPrefetch(record)}>
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
