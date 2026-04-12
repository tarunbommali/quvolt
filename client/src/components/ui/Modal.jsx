import { modalStyles } from '../../styles/layoutStyles';

const Modal = ({ open, children, className = '' }) => {
    if (!open) return null;

    return (
        <div className={`${modalStyles.overlay} ${className}`.trim()}>
            {children}
        </div>
    );
};

export default Modal;
