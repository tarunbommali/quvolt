import { motion as Motion } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';

/**
 * Generic reusable table component
 * ✅ Sorting, pagination, loading states
 * ✅ Customizable columns and rendering
 * ✅ Token-based styling
 */
const DataTable = ({
    columns = [],
    rows = [],
    loading = false,
    sortBy = null,
    sortOrder = 'asc',
    onSort = () => {},
    currentPage = 1,
    pageSize = 10,
    totalRows = 0,
    onPageChange = () => {},
    emptyState = null,
}) => {
    const tableWrap = 'mt-4 overflow-x-auto';
    const table = 'min-w-full text-left text-sm';
    const thead = 'border-b border-gray-200 text-xs text-gray-400 dark:border-gray-700 dark:text-gray-500';
    const th = 'py-2 pr-3 font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors';
    const tbodyRowEven = 'bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700';
    const tbodyRowOdd = 'bg-gray-50/70 dark:bg-gray-700/40 border-b border-gray-100 dark:border-gray-700';
    const td = 'py-2 pr-3 text-gray-600 dark:text-gray-300';
    const tdStrong = 'py-2 pr-3 font-semibold text-gray-900 dark:text-gray-100';

    if (loading) {
        return (
            <div className={tableWrap}>
                <div className={table}>
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className={`h-12 bg-gray-100 dark:bg-gray-700 ${i % 2 === 0 ? tbodyRowEven : tbodyRowOdd}`} />
                    ))}
                </div>
            </div>
        );
    }

    if (!rows.length) {
        return (
            emptyState || (
                <div className="flex h-40 items-center justify-center text-center text-sm text-gray-500 dark:text-gray-400">
                    No data available
                </div>
            )
        );
    }

    return (
        <>
            <div className={tableWrap}>
                <table className={table}>
                    <thead className={thead}>
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={th}
                                    style={{ width: col.width }}
                                    onClick={() => col.sortable && onSort(col.key)}
                                >
                                    <div className="flex items-center gap-1">
                                        {col.label}
                                        {col.sortable && sortBy === col.key && (
                                            sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => (
                            <Motion.tr
                                key={row.id || idx}
                                className={idx % 2 === 0 ? tbodyRowEven : tbodyRowOdd}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                {columns.map((col) => (
                                    <td
                                        key={`${row.id}-${col.key}`}
                                        className={col.strong ? tdStrong : td}
                                        style={{ width: col.width }}
                                    >
                                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                                    </td>
                                ))}
                            </Motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pageSize < totalRows && (
                <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>
                        Page {currentPage} of {Math.ceil(totalRows / pageSize)} • {totalRows} total
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="rounded px-3 py-1 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-700"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage * pageSize >= totalRows}
                            className="rounded px-3 py-1 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-700"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default DataTable;
