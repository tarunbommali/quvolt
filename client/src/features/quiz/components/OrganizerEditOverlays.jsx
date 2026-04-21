import { AnimatePresence } from 'framer-motion';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog';
import Toast from '../../../components/common/Toast';
import ErrorState from '../../../components/common/ErrorState';
import ImportSlidesModal from './ImportSlidesModal';
import AIGeneratorModal from './AIGeneratorModal';
import { components } from '../../../styles/components';

/**
 * Overlay stack for the host editor.
 * @param {{ editor: object }} props
 */
const OrganizerEditOverlays = ({ editor }) => {
    const {
        activeQuiz,
        toast,
        setToast,
        confirmDialog,
        setConfirmDialog,
        importDialogOpen,
        setImportDialogOpen,
        aiDialogOpen,
        setAIDialogOpen,
        importJson,
        setImportJson,
        importError,
        setImportError,
        isImporting,
        saveError,
        persistFullState,
        handleImportSlides,
        handleAIGenerate,
        handleAISave,
    } = editor;

    return (
        <>
            <AnimatePresence>
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                {confirmDialog && (
                    <ConfirmationDialog
                        open={!!confirmDialog}
                        message={confirmDialog.message}
                        confirmLabel="Delete"
                        onConfirm={confirmDialog.onConfirm}
                        onCancel={() => setConfirmDialog(null)}
                    />
                )}
            </AnimatePresence>

            <ImportSlidesModal
                open={importDialogOpen}
                importJson={importJson}
                importError={importError}
                isImporting={isImporting}
                onJsonChange={(value) => {
                    setImportJson(value);
                    if (importError) setImportError('');
                }}
                onClose={() => {
                    setImportDialogOpen(false);
                    setImportError('');
                }}
                onImport={handleImportSlides}
            />

            <AIGeneratorModal
                open={aiDialogOpen}
                quizId={activeQuiz?._id}
                onClose={() => setAIDialogOpen(false)}
                onGenerate={handleAIGenerate}
                onSave={handleAISave}
            />

            <div className={components.host.errorWrap}>
                {saveError ? (
                    <ErrorState
                        title={saveError.title || 'Failed to save'}
                        message={saveError.message}
                        onAction={() => persistFullState()}
                    />
                ) : null}
            </div>
        </>
    );
};

export default OrganizerEditOverlays;

