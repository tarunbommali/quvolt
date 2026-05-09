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
                        Supported fields: <span className={formStyles.helperStrong}>text</span>, <span className={formStyles.helperStrong}>question</span>, <span className={formStyles.helperStrong}>options</span>, <span className={formStyles.helperStrong}>correctOption</span>, <span className={formStyles.helperStrong}>correctAnswer</span>, <span className={formStyles.helperStrong}>timeLimit</span>, <span className={formStyles.helperStrong}>shuffleOptions</span>, <span className={formStyles.helperStrong}>questionType</span>, <span className={formStyles.helperStrong}>mediaUrl</span>, <span className={formStyles.helperStrong}>difficulty</span>, and <span className={formStyles.helperStrong}>explanation</span>.
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
