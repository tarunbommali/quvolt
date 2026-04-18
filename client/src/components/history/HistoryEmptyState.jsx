import { Clock } from 'lucide-react';
import Card from '../common/ui/Card';

const HistoryEmptyState = ({
    title = 'No Quiz Activity Yet',
    message = 'Your learning progress will appear here after you participate in or host a quiz.'
}) => (
    <Card className="bg-white p-20 flex flex-col items-center justify-center text-center space-y-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="p-6 bg-gray-50 rounded-full shadow-sm text-slate-400">
            <Clock size={48} />
        </div>
        <div>
            <h3 className="text-2xl font-black text-slate-900 uppercase">{title}</h3>
            <p className="text-slate-500 font-bold max-w-xs text-sm mt-2">
                {message}
            </p>
        </div>
    </Card>
);

export default HistoryEmptyState;
