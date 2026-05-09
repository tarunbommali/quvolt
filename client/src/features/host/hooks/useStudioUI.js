import { useState, useEffect, useCallback } from 'react';

/**
 * UI hook for managing dashboard visibility, view modes, and dialogs.
 */
export const useStudioUI = () => {
    const [showCreate, setShowCreate] = useState(false);
    const [viewMode, setViewMode] = useState('list');
    const [isMobileView, setIsMobileView] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [editingQuizId, setEditingQuizId] = useState(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [cloning, setCloning] = useState(false);
    const [sortMode, setSortMode] = useState('activity');
    const [filterMode, setFilterMode] = useState('all');

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
        setFilterMode
    };
};

export default useStudioUI;
