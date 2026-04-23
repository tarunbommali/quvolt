import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buttonStyles } from '../../../styles/index';

/**
 * Reusable pagination component
 * ✅ Next/previous navigation
 * ✅ Page indicator
 */
const Pagination = ({
    currentPage = 1,
    totalPages = 1,
    onPageChange = () => {},
    loading = false,
}) => {
    const canGoPrev = currentPage > 1;
    const canGoNext = currentPage < totalPages;

    return (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <span className="text-sm text-gray-600 dark:text-gray-400">
                Page <span className="font-semibold">{currentPage}</span> of{' '}
                <span className="font-semibold">{totalPages}</span>
            </span>

            <div className="flex gap-2">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={!canGoPrev || loading}
                    className={`${buttonStyles.base} ${buttonStyles.secondary} h-9 w-9 p-0`}
                    aria-label="Previous page"
                >
                    <ChevronLeft size={16} />
                </button>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={!canGoNext || loading}
                    className={`${buttonStyles.base} ${buttonStyles.secondary} h-9 w-9 p-0`}
                    aria-label="Next page"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
