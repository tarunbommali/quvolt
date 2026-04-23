import React from 'react';
import { cards, typography, cx } from '../../../styles/index';

const formatNumber = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '0';
    return Number(value).toLocaleString();
};

const MetricsCards = ({ metrics = [] }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {metrics.map((metric) => (
                <div key={metric.label} className={cx(cards.metric, 'hover:border-[var(--qb-primary)]/20 transition-colors group')}>
                    <p className={typography.metaLabel}>{metric.label}</p>
                    <p className={typography.metricMd}>
                        {metric.suffix === '%' ? `${formatNumber(metric.value)}%` : formatNumber(metric.value)}
                    </p>
                    <p className={cx(typography.small, 'opacity-70 group-hover:opacity-100 transition-opacity')}>{metric.caption}</p>
                </div>
            ))}
        </div>
    );
};

export default MetricsCards;
