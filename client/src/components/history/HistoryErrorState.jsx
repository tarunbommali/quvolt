import Card from '../common/ui/Card';
import Button from '../common/ui/Button';

const HistoryErrorState = ({ error, onRetry }) => (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="bg-white p-8 text-center space-y-4 max-w-sm rounded-4xl border border-gray-100 shadow-sm">
            <p className="text-red-400 font-bold">{error}</p>
            <Button onClick={onRetry} className="btn-premium text-sm px-6 py-2">
                Retry
            </Button>
        </Card>
    </div>
);

export default HistoryErrorState;
