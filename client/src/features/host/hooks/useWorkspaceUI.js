import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * UI hook for managing dashboard visibility, view modes, and dialogs.
 */
export const useWorkspaceUI = () => {
    const [showCreate, setShowCreate] = useState(false);
    // Load defaults from localStorage if available
    const [viewMode, setViewMode] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('workspace_viewMode');
            if (saved) return saved;
        }
        return 'list';
    });
    
    const [sortMode, setSortMode] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('workspace_sortMode');
            if (saved) return saved;
        }
        return 'createdAt_desc'; // new format: sortBy_order
    });
    
    const [filterMode, setFilterMode] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('workspace_filterMode');
            if (saved) return saved;
        }
        return 'all';
    });

    const [dateRange, setDateRange] = useState(() => {
        if (typeof window !== 'undefined') {
            const savedStart = localStorage.getItem('workspace_startDate');
            const savedEnd = localStorage.getItem('workspace_endDate');
            if (savedStart || savedEnd) {
                return { startDate: savedStart || '', endDate: savedEnd || '' };
            }
        }
        return { startDate: '', endDate: '' };
    });

    // Save to localStorage whenever they change
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('workspace_viewMode', viewMode);
        }
    }, [viewMode]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('workspace_sortMode', sortMode);
        }
    }, [sortMode]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('workspace_filterMode', filterMode);
        }
    }, [filterMode]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (dateRange.startDate) localStorage.setItem('workspace_startDate', dateRange.startDate);
            else localStorage.removeItem('workspace_startDate');
            
            if (dateRange.endDate) localStorage.setItem('workspace_endDate', dateRange.endDate);
            else localStorage.removeItem('workspace_endDate');
        }
    }, [dateRange]);

    const [isMobileView, setIsMobileView] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [editingQuizId, setEditingQuizId] = useState(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [cloning, setCloning] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const mediaQuery = window.matchMedia('(max-width: 767px)');
        const handleViewportChange = () => {
            const nextIsMobile = mediaQuery.matches;
            setIsMobileView(nextIsMobile);
            if (nextIsMobile) {
                setViewMode('list');
            }
        };

        handleViewportChange();
        mediaQuery.addEventListener('change', handleViewportChange);

        return () => {
            mediaQuery.removeEventListener('change', handleViewportChange);
        };
    }, []);

    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

    // Calculate active filters (excluding defaults)
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (sortMode !== 'createdAt_desc') count++;
        if (viewMode !== 'list' && !isMobileView) count++; // List is default
        if (filterMode !== 'all') count++;
        if (dateRange.startDate) count++;
        if (dateRange.endDate) count++;
        return count;
    }, [sortMode, viewMode, filterMode, dateRange, isMobileView]);

    const handleToggleCreate = useCallback(() => {
        setShowCreate((prev) => !prev);
    }, []);

    const handleViewModeChange = useCallback((nextMode) => {
        setViewMode(nextMode);
    }, []);

    const showConfirm = useCallback((message, onConfirm) => {
        setConfirmDialog({ message, onConfirm });
    }, []);

    return {
        showCreate,
        setShowCreate,
        handleToggleCreate,
        viewMode,
        effectiveViewMode: isMobileView ? 'list' : viewMode,
        handleViewModeChange,
        isMobileView,
        confirmDialog,
        setConfirmDialog,
        showConfirm,
        editingQuizId,
        setEditingQuizId,
        editingTitle,
        setEditingTitle,
        cloning,
        setCloning,
        sortMode,
        setSortMode,
        filterMode,
        setFilterMode,
        dateRange,
        setDateRange,
        isFilterModalOpen,
        setIsFilterModalOpen,
        activeFilterCount
    };
};

export default useWorkspaceUI;
