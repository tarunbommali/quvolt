import ErrorState from '../../../components/common/ErrorState';

const HistoryErrorState = ({ error, onRetry }) => (
    <div className="py-4">
        <ErrorState
            title="Failed to load history"
            message={error || 'Something went wrong while loading history. Please try again.'}
            onAction={onRetry}
            actionLabel="Retry"
        />
    </div>
);

export default HistoryErrorState;
