import { X } from 'lucide-react';
import Modal, { ModalShell, ModalHeader, ModalBody, ModalFooter, ModalButton } from '../../../components/common/ui/Modal';
import { formStyles, panelStyles, cx } from '../../../styles/index';

/**
 * ImportSlidesModal
 *
 * Lets the host paste a JSON array of questions to bulk-import into the quiz.
 * All layout/spacing is inherited from ModalShell / ModalHeader / ModalBody / ModalFooter.
 * Zero function changes — only the wrapping markup is refactored.
 */
const ImportSlidesModal = ({
    open,
    importJson,
    importError,
    isImporting,
    onJsonChange,
    onClose,
    onImport,
}) => (
    <Modal open={open} onClose={onClose}>
        <ModalShell>
            <ModalHeader
                title="Import Slides from JSON"
                subtitle={
                    <>
                        Paste a JSON array or an object with a{' '}
                        <span className={formStyles.helperStrong}>questions</span> or{' '}
                        <span className={formStyles.helperStrong}>slides</span> array.
                    </>
                }
                onClose={onClose}
                closeLabel="Close JSON import dialog"
            />

            <ModalBody>
                <textarea
                    className="min-h-[200px] w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors"
                    value={importJson}
                    onChange={(e) => onJsonChange(e.target.value)}
                    placeholder={`[
  {
    "text": "What is Python primarily used for?",
    "question": "What is Python primarily used for?",
    "options": [
      "Web development and automation",
      "Only hardware programming",
      "Only database storage",
      "Only graphic design"
    ],
    "correctOption": 0,
    "correctAnswer": "Web development and automation",
    "timeLimit": 15,
    "shuffleOptions": false,
    "questionType": "multiple-choice",
    "mediaUrl": null,
    "difficulty": "easy",
    "explanation": "Python is a general-purpose language used for web development, automation, and more."
  }
]`}
                />

                <div className={panelStyles.mutedBox}>
                    Supported fields:{' '}
                    {['text', 'question', 'options', 'correctOption', 'correctAnswer',
                        'timeLimit', 'shuffleOptions', 'questionType', 'mediaUrl',
                        'difficulty', 'explanation'].map((f, i, arr) => (
                        <span key={f}>
                            <span className={formStyles.helperStrong}>{f}</span>
                            {i < arr.length - 1 ? ', ' : '.'}
                        </span>
                    ))}
                </div>

                {importError && (
                    <div className={panelStyles.errorBox}>{importError}</div>
                )}
            </ModalBody>

            <ModalFooter>
                <ModalButton variant="ghost" onClick={onClose}>
                    Cancel
                </ModalButton>
                <ModalButton variant="primary" onClick={onImport} disabled={isImporting}>
                    {isImporting ? 'Importing…' : 'Import Slides'}
                </ModalButton>
            </ModalFooter>
        </ModalShell>
    </Modal>
);

export default ImportSlidesModal;
