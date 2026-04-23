import { X } from 'lucide-react';
import { modalStyles } from '../../../styles/layoutStyles';
import { controlStyles, formStyles, textStyles, panelStyles, buttonStyles, components, cx } from '../../../styles/index';

const ImportSlidesModal = ({
    open,
    importJson,
    importError,
    isImporting,
    onJsonChange,
    onClose,
    onImport,
}) => {
    if (!open) return null;

    return (
        <div className={modalStyles.overlayTop}>
            <div className={components.host.importShell}>
                <div className={modalStyles.headerRow}>
                    <div>
                        <h3 className={textStyles.titleLg}>Import slides from JSON</h3>
                        <p className={cx(components.analytics.metricCaption, textStyles.subtitle)}>
                            Paste a JSON array or an object with a <span className={formStyles.helperStrong}>questions</span> or <span className={formStyles.helperStrong}>slides</span> array.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={controlStyles.iconButtonLg}
                        aria-label="Close JSON import dialog"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className={modalStyles.contentSection}>
                    <textarea
                        className={modalStyles.textarea}
                        value={importJson}
                        onChange={(e) => onJsonChange(e.target.value)}
                        placeholder={`[
  {
    "text": "Which option is correct?",
    "question": "Which option is correct?",
    "title": "Which option is correct?",
    "options": ["Answer A", "Answer B", "Answer C", "Answer D"],
    "answers": ["Answer A", "Answer B", "Answer C", "Answer D"],
    "choices": ["Answer A", "Answer B", "Answer C", "Answer D"],
    "correctOption": 1,
    "correctAnswer": "Answer B",
    "correct": "Answer B",
    "correctIndex": 1,
    "timeLimit": 15,
    "shuffleOptions": false,
    "questionType": "multiple-choice",
    "mediaUrl": null
  }
]`}
                    />

                    <div className={panelStyles.mutedBox}>
                        Supported fields: <span className={formStyles.helperStrong}>text</span>, <span className={formStyles.helperStrong}>question</span>, <span className={formStyles.helperStrong}>title</span>, <span className={formStyles.helperStrong}>options</span>, <span className={formStyles.helperStrong}>answers</span>, <span className={formStyles.helperStrong}>choices</span>, <span className={formStyles.helperStrong}>correctOption</span>, <span className={formStyles.helperStrong}>correctAnswer</span>, <span className={formStyles.helperStrong}>correct</span>, <span className={formStyles.helperStrong}>correctIndex</span>, <span className={formStyles.helperStrong}>timeLimit</span>, <span className={formStyles.helperStrong}>shuffleOptions</span>, <span className={formStyles.helperStrong}>questionType</span>, and <span className={formStyles.helperStrong}>mediaUrl</span>.
                    </div>

                    {importError && (
                        <div className={panelStyles.errorBox}>
                            {importError}
                        </div>
                    )}
                </div>

                <div className={modalStyles.footerRight}>
                    <button
                        type="button"
                        onClick={onClose}
                        className={cx(buttonStyles.secondary, components.host.aiActionBtn)}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onImport}
                        disabled={isImporting}
                        className={cx(buttonStyles.primary, components.host.aiGenerateBtn)}
                    >
                        {isImporting ? 'Importing...' : 'Import Slides'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportSlidesModal;
