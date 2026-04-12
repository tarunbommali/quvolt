import { useCallback, useEffect, useRef, useState } from 'react';

const useToast = (duration = 4000) => {
    const [toast, setToast] = useState(null);
    const timeoutRef = useRef(null);

    const showToast = useCallback((message, type = 'error') => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setToast({ message, type });
        timeoutRef.current = setTimeout(() => setToast(null), duration);
    }, [duration]);

    const clearToast = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setToast(null);
    }, []);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return { toast, showToast, clearToast };
};

export default useToast;
