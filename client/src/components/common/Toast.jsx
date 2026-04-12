import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { motion as Motion } from 'framer-motion';

const Toast = ({ message, type = 'error', onClose }) => {
    if (!message) return null;
    const isError = type === 'error';

    return (
        <Motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className={`fixed top-4 left-1/2 z-200 -translate-x-1/2 flex items-center gap-3 px-6 py-4 bg-white rounded-2xl font-bold shadow-xl border ${isError ? 'border-red-200 text-red-600' : 'border-green-200 text-green-600'}`}
        >
            {isError ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <span>{message}</span>
            <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={16} /></button>
        </Motion.div>
    );
};

export default Toast;
