import { useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cx } from '../../../styles/index';

// ─── Design tokens (single source of truth) ────────────────────────────────
//   max-width : 560px
//   border-radius : 12px
//   padding : 24px
//   section gap : 16px
//   header font-size : 20px / font-weight : 700
//   subtitle font-size : 13px / color : #666
//   footer padding : 16px 24px / border-top : 1px solid #eee
//   button height : 40px / border-radius : 999px / padding : 0 20px / font-size : 14px

// ─── Backdrop + centering overlay ──────────────────────────────────────────

/**
 * Modal
 * Renders a backdrop with blur/dim and vertically/horizontally centres
 * its child. Click backdrop → calls onClose. Escape key → calls onClose.
 *
 * Props:
 *   open     {boolean}
 *   onClose  {() => void}
 *   children {ReactNode}
 */
const Modal = ({ open, onClose, children }) => {
    // Escape to close
    useEffect(() => {
        if (!open || !onClose) return;
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <Motion.div
                    key="modal-backdrop"
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={onClose}
                >
                    {/* Prevent backdrop click from propagating into the panel */}
                    <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[560px]">
                        <Motion.div
                            initial={{ opacity: 0, scale: 0.97, y: -12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97, y: -12 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                            {children}
                        </Motion.div>
                    </div>
                </Motion.div>
            )}
        </AnimatePresence>
    );
};

// ─── ModalShell ─────────────────────────────────────────────────────────────

/**
 * ModalShell
 * The white card that wraps every modal. Enforces max-width, border-radius,
 * and overflow clipping. Children are Modal sections (header / body / footer).
 */
export const ModalShell = ({ children, className = '' }) => (
    <div
        className={cx(
            'w-full bg-white dark:bg-gray-900',
            'rounded-xl',            // border-radius: 12px
            'shadow-2xl',
            'border border-gray-100 dark:border-gray-700',
            'overflow-hidden flex flex-col',
            className,
        )}
    >
        {children}
    </div>
);

// ─── ModalHeader ────────────────────────────────────────────────────────────

/**
 * ModalHeader
 * Renders title + optional subtitle left-aligned, close button on the right.
 * Uses the exact token values: 24px padding, 20px/700 title, 13px/#666 subtitle.
 */
export const ModalHeader = ({ title, subtitle, onClose, closeLabel = 'Close dialog' }) => (
    <div className="flex items-start justify-between gap-4 px-6 py-6 border-b border-[#eee] dark:border-gray-700">
        {/* px-6 = 24px, py-6 = 24px */}
        <div className="space-y-[4px]">
            <h2
                className="text-[20px] font-bold leading-tight text-slate-900 dark:text-white"
            >
                {title}
            </h2>
            {subtitle && (
                <p className="text-[13px] leading-snug" style={{ color: '#666' }}>
                    {subtitle}
                </p>
            )}
        </div>
        {onClose && (
            <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-gray-100 hover:text-slate-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
            >
                <X size={18} />
            </button>
        )}
    </div>
);

// ─── ModalBody ──────────────────────────────────────────────────────────────

/**
 * ModalBody
 * Scrollable content area with 24px padding and 16px gap between sections.
 */
export const ModalBody = ({ children, className = '' }) => (
    <div
        className={cx(
            'flex-1 overflow-y-auto',
            'p-6',              // padding: 24px
            'flex flex-col',
            'gap-4',            // gap between sections: 16px
            className,
        )}
    >
        {children}
    </div>
);

// ─── ModalFooter ────────────────────────────────────────────────────────────

/**
 * ModalFooter
 * Right-aligned action bar. Enforces footer padding 16px 24px + border-top.
 */
export const ModalFooter = ({ children, className = '' }) => (
    <div
        className={cx(
            'flex items-center justify-end gap-3',
            'px-6 py-4',        // padding: 16px 24px
            'border-t border-[#eee] dark:border-gray-700',
            'bg-gray-50/60 dark:bg-gray-800/40',
            className,
        )}
    >
        {children}
    </div>
);

// ─── ModalButton ────────────────────────────────────────────────────────────

/**
 * ModalButton
 * Shared button token: h-10 / rounded-full / px-5 / text-[14px].
 *
 * variant: 'primary' | 'secondary' | 'ghost'
 */
export const ModalButton = ({ children, variant = 'secondary', className = '', ...props }) => {
    const variants = {
        primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50',
        secondary: 'border border-gray-200 dark:border-gray-600 text-slate-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50',
        ghost: 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-50',
    };

    return (
        <button
            type="button"
            className={cx(
                'inline-flex items-center justify-center gap-2',
                'h-10',             // button height: 40px
                'rounded-full',     // border-radius: 999px
                'px-5',             // padding: 0 20px
                'text-[14px] font-semibold',
                'transition-colors duration-150',
                variants[variant] ?? variants.secondary,
                className,
            )}
            {...props}
        >
            {children}
        </button>
    );
};

export default Modal;
