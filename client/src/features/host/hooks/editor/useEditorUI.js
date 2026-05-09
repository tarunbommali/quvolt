import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * UI hook for managing common editor interface elements like toasts and confirmation dialogs.
 */
export const useEditorUI = () => {
    const [toast, setToast] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const toastTimeoutRef = useRef(null);

    const showToast = useCallback((message, type = 'error') => {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setToast({ message, type });
        toastTimeoutRef.current = setTimeout(() => setToast(null), 3500);
    }, []);

    useEffect(() => {
        return () => {
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        };
    }, []);

    const showConfirm = useCallback((message, onConfirm) => {
        setConfirmDialog({ message, onConfirm });
    }, []);

    return {
        toast,
        setToast,
        showToast,
        confirmDialog,
        setConfirmDialog,
        showConfirm
    };
};

export default useEditorUI;
