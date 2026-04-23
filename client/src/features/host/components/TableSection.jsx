import { components, cx } from '../../../styles/index';


const TableSection = ({ rows = [] }) => (
    <div className={components.analytics.cardCompact}>
        <h3 className={components.analytics.sectionTitleUpper}>Top Templates</h3>
        <div className={components.analytics.tableWrap}>
            <table className={components.analytics.table}>
                <thead>
                    <tr className={components.analytics.tableHeadRow}>
                        <th className={components.analytics.tableHeadCell}>Template</th>
                        <th className={components.analytics.tableHeadCell}>Accuracy</th>
                        <th className={components.analytics.tableHeadCell}>Participants</th>
                        <th className={components.analytics.tableHeadCell}>Avg Score</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr
                            key={row.quizId || row.title || index}
                            className={cx(index % 2 === 0 ? components.analytics.tableBodyRowEven : components.analytics.tableBodyRowOdd)}
                        >
                            <td className={components.analytics.tableBodyCellStrong}>{row.title || 'Untitled Template'}</td>
                            <td className={components.analytics.tableBodyCell}>{Number(row.accuracyPercent || 0).toFixed(1)}%</td>
                            <td className={components.analytics.tableBodyCell}>{Number(row.participantCount || 0).toLocaleString()}</td>
                            <td className={components.analytics.tableBodyCell}>{Number(row.averageScore || 0).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

export default TableSection;

