import { cx } from '../../../styles/index';


const STATUS_STYLES = {
    live: 'status-live-pill',
    ongoing: 'status-live-pill',
    upcoming: 'theme-status-caution',
    waiting: 'bg-indigo-100 text-indigo-700',
    aborted: 'theme-status-danger',
    completed: 'bg-slate-100 text-slate-600',
    finished: 'bg-slate-100 text-slate-600',
    draft: 'theme-status-warning',
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
        <span className={cx(
            'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest',
            tone,
            className,
        )}>
            {text}
        </span>
    );
};

export default StatusBadge;
