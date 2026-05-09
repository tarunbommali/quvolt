import { useState, useEffect, useMemo } from 'react';
import usePaginatedFetch from '../../../hooks/usePaginatedFetch';

/**
 * Domain hook for managing the paginated template list, searching, and sorting.
 */
export const useTemplateList = (folderId) => {
    const [searchQuery, setSearchQuery] = useState('');

    const {
        data: visibleTemplates,
        loading: isLoadingTemplates,
        pagination,
        page,
        setPage,
        limit,
        setLimit,
        sortBy,
        order,
        setSearch,
        setSort,
        refetch,
        setData
    } = usePaginatedFetch('/api/quiz/templates', {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'desc',
        extraParams: useMemo(() => ({ parentId: folderId || 'none' }), [folderId])
    });

    // Debounced search effect
    useEffect(() => {
        const handler = setTimeout(() => {
            setSearch(searchQuery);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery, setSearch]);

    return {
        templates: visibleTemplates,
        isLoading: isLoadingTemplates,
        pagination,
        page,
        setPage,
        limit,
        setLimit,
        sortBy,
        order,
        setSort,
        searchQuery,
        setSearchQuery,
        refetch,
        setData
    };
};

export default useTemplateList;
