import { components } from '../../../styles/components';
import { layout } from '../../../styles/layout';
import { cx } from '../../../styles/theme';

const MetricsSection = ({ primaryMetrics, performance, participants }) => (
    <div className={layout.stack}>
        <div className={layout.stackTight}>
            <h3 className={components.analytics.sectionTitleMeta}>Primary Metrics</h3>
            <div className={layout.metricGrid4}>
                {primaryMetrics.map((metric) => (
                    <div key={metric.label} className={components.analytics.card}>
                        <p className={components.analytics.metricLabel}>{metric.label}</p>
                        <p className={components.analytics.metricValue}>{metric.value}</p>
                    </div>
                ))}
            </div>
        </div>

        <div className={cx(components.analytics.card, components.analytics.cardStack)}>
            <h3 className={components.analytics.sectionTitleUpper}>Performance Overview</h3>
            <div className={layout.metricGrid3}>
                <div className={components.analytics.subtleCard}>
                    <p className={components.analytics.metricLabel}>Total Attempts</p>
                    <p className={components.analytics.metricValue}>{Number(performance.totalAttempts || 0).toLocaleString()}</p>
                </div>
                <div className={components.analytics.subtleCard}>
                    <p className={components.analytics.metricLabel}>Avg Score</p>
                    <p className={components.analytics.metricValue}>{Number(performance.averageScore || 0).toFixed(1)}</p>
                </div>
                <div className={components.analytics.subtleCard}>
                    <p className={components.analytics.metricLabel}>Accuracy</p>
                    <p className={components.analytics.metricValue}>{Number(performance.accuracyPercent || 0).toFixed(1)}%</p>
                </div>
            </div>
        </div>

        <div className={cx(components.analytics.card, components.analytics.cardStack)}>
            <h3 className={components.analytics.sectionTitleUpper}>Participant Insights</h3>
            <div className={layout.metricGrid2x4}>
                <div className={components.analytics.subtleCard}>
                    <p className={components.analytics.metricLabel}>Invited Users</p>
                    <p className={components.analytics.metricValue}>{Number(participants.invitedUsers || 0).toLocaleString()}</p>
                </div>
                <div className={components.analytics.subtleCard}>
                    <p className={components.analytics.metricLabel}>Joined Users</p>
                    <p className={components.analytics.metricValue}>{Number(participants.joinedUsers || 0).toLocaleString()}</p>
                </div>
                <div className={components.analytics.subtleCard}>
                    <p className={components.analytics.metricLabel}>Not Joined Users</p>
                    <p className={components.analytics.metricValue}>{Number(participants.notJoinedUsers || 0).toLocaleString()}</p>
                </div>
                <div className={components.analytics.subtleCard}>
                    <p className={components.analytics.metricLabel}>Completion Rate</p>
                    <p className={components.analytics.metricValue}>{Number(participants.completionRate || 0).toFixed(1)}%</p>
                </div>
            </div>
        </div>
    </div>
);

export default MetricsSection;
