import Card from '../ui/Card';

const HistoryNoResultsState = () => (
    <Card className="bg-white p-12 text-center text-slate-500 rounded-4xl border border-gray-100 shadow-sm">
        <p className="font-bold text-lg uppercase">No matching records found.</p>
    </Card>
);

export default HistoryNoResultsState;
