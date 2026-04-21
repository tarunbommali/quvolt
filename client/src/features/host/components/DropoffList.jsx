import { components } from '../../../styles/components';

const DropoffList = ({ data = [] }) => {
    return (
        <div className={components.analytics.cardCompact}>
            <h3 className={components.analytics.sectionTitleUpper}>Drop-off Tracking</h3>
            <div className={components.analytics.stackSm}>
                {data.length === 0 && <p className={components.analytics.emptyState}>No drop-off data yet.</p>}
                {data.map((row) => (
                    <div key={`step-${row.step}`} className={components.analytics.subtleCard}>
                        <div className={components.analytics.rowBetween}>
                            <p className={components.analytics.textStrong}>Question {row.step}</p>
                            <p className={components.analytics.textDanger}>Drop: {row.dropPercent}%</p>
                        </div>
                        <p className={components.analytics.metricValue}>{row.activeUsers} active users</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DropoffList;

