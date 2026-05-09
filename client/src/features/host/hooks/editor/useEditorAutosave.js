import { useState, useRef, useEffect, useCallback } from 'react';
import { saveQuizFullState } from '../../services/host.service';
import { useEditorState } from '../../../../stores/useEditorState';
import { categorizeSaveError } from '../../utils/editorHelpers';

/**
 * Domain hook for the editor's autosave engine.
 */
export const useEditorAutosave = (activeQuizId, { showToast }) => {
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'error' | 'dirty' | 'offline'
    const [saveError, setSaveError] = useState(null);
    const [localVersion, setLocalVersion] = useState(0);
    
    const getSnapshot = useEditorState((state) => state.getSnapshot);
    const replaceFromServerQuiz = useEditorState((state) => state.replaceFromServerQuiz);
    const markClean = useEditorState((state) => state.markClean);
    
    const autoSaveTimerRef = useRef(null);
    const saveInFlightRef = useRef(false);
    const queuedSaveRef = useRef(false);

    // Utility for retrying failed requests
    const saveWithRetry = async (fn, retries = 3, delayMs = 1000) => {
        try {
            return await fn();
        } catch (e) {
            if (retries === 0 || e.response?.status === 400) throw e;
            await new Promise(res => setTimeout(res, delayMs));
            return saveWithRetry(fn, retries - 1, delayMs * 2); // Exponential backoff
        }
    };

    const persistFullState = useCallback(async ({ silent = false } = {}) => {
        if (!activeQuizId) return;

        if (!navigator.onLine) {
            setSaveStatus('offline');
            return;
        }

        if (saveInFlightRef.current) {
            queuedSaveRef.current = true;
            return;
        }

        saveInFlightRef.current = true;
        setSaveStatus('saving');
        setSaveError(null);

        try {
            const snapshot = getSnapshot();
            
            const updatedQuiz = await saveWithRetry(() => saveQuizFullState(activeQuizId, {
                slides: snapshot.slides,
                order: snapshot.order,
                config: snapshot.config,
                version: localVersion + 1 // Optimistic versioning
            }));

            replaceFromServerQuiz(updatedQuiz);
            markClean();
            setLocalVersion(updatedQuiz.version || localVersion + 1);
            setSaveStatus('saved');

            if (!silent) showToast('Saved successfully', 'success');
            return updatedQuiz;
        } catch (error) {
            const parsed = categorizeSaveError(error);
            setSaveError(parsed);
            setSaveStatus('error');
            if (!silent) showToast(parsed.message);
            throw error;
        } finally {
            saveInFlightRef.current = false;
            if (queuedSaveRef.current) {
                queuedSaveRef.current = false;
                persistFullState({ silent: true });
            }
        }
    }, [activeQuizId, getSnapshot, replaceFromServerQuiz, markClean, showToast, localVersion]);

    // Offline listener
    useEffect(() => {
        const handleOnline = () => {
            if (saveStatus === 'offline') persistFullState({ silent: true });
        };
        const handleOffline = () => setSaveStatus('offline');

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [saveStatus, persistFullState]);

    // Controlled trigger for autosave
    const triggerAutosave = useCallback(() => {
        if (!activeQuizId) return;
        
        setSaveStatus('dirty');
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

        autoSaveTimerRef.current = setTimeout(() => {
            persistFullState({ silent: true }).catch(() => {});
        }, 1500);
    }, [activeQuizId, persistFullState]);

    return {
        saveStatus,
        saveError,
        persistFullState,
        triggerAutosave,
        localVersion
    };
};

export default useEditorAutosave;
