import { modalStyles } from '../../../styles/layoutStyles';
import { cx } from '../../../styles/index';

const Modal = ({ open, children, className = '' }) => {
    if (!open) return null;

    return (
        <div className={cx(modalStyles.overlay, className)}>
            {children}
        </div>
    );
};

export default Modal;
