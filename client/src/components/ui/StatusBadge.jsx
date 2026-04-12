const STATUS_STYLES = {
    live: 'bg-green-100 text-green-700 animate-pulse',
    ongoing: 'bg-green-100 text-green-700 animate-pulse',
    upcoming: 'bg-violet-100 text-violet-700',
    waiting: 'bg-indigo-100 text-indigo-700',
    aborted: 'bg-red-100 text-red-700',
    completed: 'bg-slate-100 text-slate-600',
    finished: 'bg-slate-100 text-slate-600',
    draft: 'bg-amber-100 text-amber-700',
    active: 'bg-emerald-100 text-emerald-700',
    default: 'bg-slate-100 text-slate-600',
};

const STATUS_LABELS = {
    live: 'Live Now',
    ongoing: 'Live Now',
    upcoming: 'Upcoming',
    waiting: 'Waiting',
    aborted: 'Aborted',
    completed: 'Completed',
    finished: 'Completed',
    draft: 'Draft',
    active: 'Active',
    default: 'Status',
};

const normalizeStatus = (status) => (status || '').toLowerCase();

const StatusBadge = ({ status, label, className = '' }) => {
    const normalized = normalizeStatus(status);
    const tone = STATUS_STYLES[normalized] || STATUS_STYLES.default;
    const text = label || STATUS_LABELS[normalized] || STATUS_LABELS.default;

    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${tone} ${className}`.trim()}>
            {text}
        </span>
    );
};

export default StatusBadge;
