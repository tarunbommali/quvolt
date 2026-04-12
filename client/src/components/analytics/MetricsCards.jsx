import { cardStyles } from '../../styles/cardStyles';
import { textStyles } from '../../styles/commonStyles';
import { components } from '../../styles/components';
import { cx } from '../../styles/theme';

const formatNumber = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '0';
    return Number(value).toLocaleString();
};

const MetricsCards = ({ metrics = [] }) => {
    return (
        <div className={cardStyles.metricGrid}>
            {metrics.map((metric) => (
                <div key={metric.label} className={cardStyles.metricCard}>
                    <p className={textStyles.overline}>{metric.label}</p>
                    <p className={cx(components.analytics.metricValue2Xl, textStyles.value2Xl)}>{metric.suffix === '%' ? `${formatNumber(metric.value)}%` : formatNumber(metric.value)}</p>
                    <p className={cx(components.analytics.metricCaption, textStyles.tinyMuted)}>{metric.caption}</p>
                </div>
            ))}
        </div>
    );
};

export default MetricsCards;
