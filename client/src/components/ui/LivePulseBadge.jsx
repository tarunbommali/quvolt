import { Activity } from 'lucide-react';
import { cx } from '../../styles/theme';

const formatCount = (value) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '--';
    return value.toLocaleString('en-IN');
};

const LivePulseBadge = ({ count = 0, label = 'users live', className = '' }) => {
    return (
        <div className={cx('realtime-pill', className)} aria-live="polite">
            <span className="live-dot" aria-hidden="true" />
            <Activity size={14} aria-hidden="true" />
            <span className="font-semibold">{formatCount(count)}</span>
            <span className="text-xs opacity-90">{label}</span>
        </div>
    );
};

export default LivePulseBadge;
