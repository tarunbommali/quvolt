import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { components } from '../../../styles/components';
import { cx } from '../../../styles/theme';

const Pagination = ({ 
    pagination, 
    onPageChange, 
    onLimitChange,
    showLimitSelector = true 
}) => {
    const { page, totalPages, total, limit } = pagination;
    const styles = components.pagination;

    if (totalPages <= 1 && total <= limit && !showLimitSelector) return null;

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            let start = Math.max(1, page - 2);
            let end = Math.min(totalPages, start + maxVisible - 1);
            
            if (end === totalPages) {
                start = Math.max(1, end - maxVisible + 1);
            }
            
            for (let i = start; i <= end; i++) pages.push(i);
        }
        return pages;
    };

    return (
        <div className={styles.wrapper}>
            <div className="flex items-center gap-4">
                <p className={styles.info}>
                    Showing <span className={styles.infoStrong}>{(page - 1) * limit + 1}</span> to{' '}
                    <span className={styles.infoStrong}>{Math.min(page * limit, total)}</span> of{' '}
                    <span className={styles.infoStrong}>{total}</span> results
                </p>
                
                {showLimitSelector && (
                    <select 
                        className={styles.select}
                        value={limit}
                        onChange={(e) => onLimitChange(parseInt(e.target.value))}
                    >
                        {[10, 20, 50].map(val => (
                            <option key={val} value={val}>{val} per page</option>
                        ))}
                    </select>
                )}
            </div>

            <nav className={styles.nav} aria-label="Pagination">
                {/* First Page */}
                <button
                    onClick={() => onPageChange(1)}
                    disabled={page === 1}
                    className={cx(
                        styles.btn,
                        styles.btnFirst,
                        page === 1 ? styles.btnDisabled : styles.btnIdle
                    )}
                >
                    <ChevronsLeft size={16} />
                </button>

                {/* Prev Page */}
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                    className={cx(
                        styles.btn,
                        page === 1 ? styles.btnDisabled : styles.btnIdle
                    )}
                >
                    <ChevronLeft size={16} />
                </button>

                {/* Page Numbers */}
                {getPageNumbers().map(num => (
                    <button
                        key={num}
                        onClick={() => onPageChange(num)}
                        className={cx(
                            styles.btn,
                            num === page ? styles.btnActive : styles.btnIdle
                        )}
                    >
                        {num}
                    </button>
                ))}

                {/* Next Page */}
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === totalPages}
                    className={cx(
                        styles.btn,
                        page === totalPages ? styles.btnDisabled : styles.btnIdle
                    )}
                >
                    <ChevronRight size={16} />
                </button>

                {/* Last Page */}
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={page === totalPages}
                    className={cx(
                        styles.btn,
                        styles.btnLast,
                        page === totalPages ? styles.btnDisabled : styles.btnIdle
                    )}
                >
                    <ChevronsRight size={16} />
                </button>
            </nav>
        </div>
    );
};

export default Pagination;
