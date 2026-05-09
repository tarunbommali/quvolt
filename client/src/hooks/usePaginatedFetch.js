import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../services/apiClient';

const usePaginatedFetch = (endpoint, initialParams = {}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Extract initial state from URL or defaults
    const [page, setPage] = useState(parseInt(searchParams.get('page')) || initialParams.page || 1);
    const [limit, setLimit] = useState(parseInt(searchParams.get('limit')) || initialParams.limit || 10);
    const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || initialParams.sortBy || 'createdAt');
    const [order, setOrder] = useState(searchParams.get('order') || initialParams.order || 'desc');
    const [search, setSearch] = useState(searchParams.get('search') || initialParams.search || '');
    
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const prevParamsRef = useRef();

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page,
                limit,
                sortBy,
                order,
                search: search.trim() || undefined,
                ...initialParams.extraParams
            };

            // Strip /api if present because apiClient already has it as baseURL
            const apiEndpoint = endpoint.startsWith('/api') ? endpoint.substring(4) : endpoint;
            const response = await apiClient.get(apiEndpoint, { params });
            
            // Handle different response structures (some might return { data: { data, pagination } } or just { data })
            const result = response.data.success ? response.data.data : response.data;
            
            if (result.pagination) {
                setData(result.data || []);
                setPagination(result.pagination);
            } else {
                // Fallback for non-paginated backend yet
                setData(Array.isArray(result) ? result : (result.data || []));
                setPagination({
                    total: Array.isArray(result) ? result.length : 0,
                    page: 1,
                    limit: result.length,
                    totalPages: 1,
                    hasNext: false,
                    hasPrev: false
                });
            }
        } catch (err) {
            console.error('[usePaginatedFetch] Error fetching data', err);
            setError(err.response?.data?.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    }, [endpoint, page, limit, sortBy, order, search, initialParams.extraParams]);

    // Update URL when params change
    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        if (page > 1) params.set('page', page); else params.delete('page');
        if (limit !== 10) params.set('limit', limit); else params.delete('limit');
        if (sortBy !== 'createdAt') params.set('sortBy', sortBy); else params.delete('sortBy');
        if (order !== 'desc') params.set('order', order); else params.delete('order');
        if (search) params.set('search', search); else params.delete('search');
        
        setSearchParams(params, { replace: true });
    }, [page, limit, sortBy, order, search]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSearch = useCallback((val) => {
        setSearch(val);
        setPage(1); // Reset to first page on search
    }, []);

    const handleSort = useCallback((newSortBy, newOrder = 'desc') => {
        setSortBy(newSortBy);
        setOrder(newOrder);
        setPage(1);
    }, []);

    return {
        data,
        loading,
        error,
        pagination,
        page,
        setPage,
        limit,
        setLimit,
        sortBy,
        order,
        search,
        setSearch: handleSearch,
        setSort: handleSort,
        refetch: fetchData,
        setData // Expose for optimistic updates
    };
};

export default usePaginatedFetch;
