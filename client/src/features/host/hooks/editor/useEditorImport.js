import { useState, useCallback } from 'react';
import { useEditorState } from '../../../../stores/useEditorState';
import { buildImportedQuestions } from '../../utils/editorHelpers';

/**
 * Domain hook for the editor's JSON slide import logic.
 */
export const useEditorImport = (showToast) => {
    const [importJson, setImportJson] = useState('');
    const [importError, setImportError] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    
    const importSlides = useEditorState((state) => state.importSlides);

    const handleImportSlides = useCallback(async () => {
        setImportError('');
        try {
            const parsed = JSON.parse(importJson);
            const importedQuestions = buildImportedQuestions(parsed);
            if (!importedQuestions.length) throw new Error('No valid slides were found in the JSON payload.');
            
            setIsImporting(true);
            importSlides(importedQuestions);
            setImportDialogOpen(false);
            setImportJson('');
            showToast(`Imported ${importedQuestions.length} slide${importedQuestions.length === 1 ? '' : 's'} successfully.`, 'success');
        } catch (error) {
            const message = error instanceof SyntaxError
                ? 'Invalid JSON. Paste a valid JSON array or object.'
                : error?.message || 'Failed to import slides';
            setImportError(message);
            showToast(message);
        } finally {
            setIsImporting(false);
        }
    }, [importJson, importSlides, showToast]);

    return {
        importJson,
        setImportJson,
        importError,
        setImportError,
        isImporting,
        importDialogOpen,
        setImportDialogOpen,
        handleImportSlides
    };
};

export default useEditorImport;
