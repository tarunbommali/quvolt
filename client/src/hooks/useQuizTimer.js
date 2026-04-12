import { useEffect } from 'react';

/**
 * Custom hook to sync local timer with server expiry
 * Updates timeLeft based on server expiry time every 500ms
 */
export const useQuizTimer = (expiry, status, onTimeUpdate) => {
    useEffect(() => {
        if (!expiry || status !== 'playing') return;

        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
            onTimeUpdate(remaining);
            if (remaining === 0) clearInterval(interval);
        }, 500);

        return () => clearInterval(interval);
    }, [expiry, status, onTimeUpdate]);
};

export default useQuizTimer;
