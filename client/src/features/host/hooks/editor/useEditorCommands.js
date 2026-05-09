import { useCallback } from 'react';

/**
 * Domain hook for the editor's command layer.
 * This separates 'what' the user did from 'how' the side effects (history, save) are handled.
 * This is the 'brain' of the editor's transaction system.
 */
export const useEditorCommands = ({ 
    triggerAutosave, 
    takeSnapshot, 
    undo, 
    redo,
    showToast 
}) => {
    
    /**
     * Executes a command with metadata for history and saving.
     */
    const executeCommand = useCallback(async (actionFn, meta = { save: true, history: true }) => {
        const startTime = performance.now();
        
        try {
            // 1. Handle History
            if (meta.history) {
                takeSnapshot();
            }

            // 2. Execute the mutation
            await actionFn();

            // 3. Handle Autosave
            if (meta.save) {
                triggerAutosave();
            }

            const duration = performance.now() - startTime;
            // Telemetry
            console.debug('[EDITOR_COMMAND]', {
                duration: `${duration.toFixed(2)}ms`,
                meta
            });

        } catch (error) {
            console.error('[EDITOR_COMMAND_ERROR]', error);
            showToast('Failed to execute action', 'error');
            // If it failed and we took a snapshot, we might want to revert, 
            // but usually React state updates are synchronous before this.
        }
    }, [takeSnapshot, triggerAutosave, showToast]);

    return {
        executeCommand,
        undo,
        redo
    };
};

export default useEditorCommands;
