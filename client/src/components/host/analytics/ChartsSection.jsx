import DifficultyBarChart from './DifficultyBarChart';
import PerformanceLineChart from './PerformanceLineChart';
import { layout } from '../../../styles/layout';

const ChartsSection = ({ performanceOverTime, questionStats }) => (
    <div className={layout.chartGrid}>
        <PerformanceLineChart data={performanceOverTime || []} />
        <DifficultyBarChart data={questionStats || []} />
    </div>
);

export default ChartsSection;
