import { motion as Motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import Button from '../ui/Button';
import { modalStyles } from '../../styles/layoutStyles';
import { textStyles } from '../../styles/commonStyles';

const ConfirmationDialog = ({ open, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel }) => {
    return (
        <div className={`${modalStyles.overlay} z-150 flex items-center justify-center ${open ? '' : 'hidden'}`}>
            <Motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                className={modalStyles.dialog}
            >
                <div className={modalStyles.body}>
                    <div className="rounded-2xl theme-status-warning p-3 theme-tone-warning">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className={textStyles.title}>Confirm action</h3>
                        <p className={`mt-1 ${textStyles.subtitle}`}>{message}</p>
                    </div>
                    <button onClick={onCancel} className={modalStyles.closeButton} aria-label="Close confirmation dialog">
                        <X size={18} />
                    </button>
                </div>

                <div className={modalStyles.footer}>
                    <Button type="button" variant="secondary" size="md" className="flex-1" onClick={onCancel}>
                        {cancelLabel}
                    </Button>
                    <Button type="button" variant="danger" size="md" className="flex-1" onClick={onConfirm}>
                        {confirmLabel}
                    </Button>
                </div>
            </Motion.div>
        </div>
    );
};

export default ConfirmationDialog;