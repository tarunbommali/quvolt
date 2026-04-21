import { motion as Motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

const ErrorToast = ({ message }) => (
    <AnimatePresence>
        {message && (
            <Motion.div
                role="alert"
                aria-live="assertive"
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                className="fixed top-4 left-1/2 -translate-x-1/2 z-(--z-toast) flex items-center gap-3 px-6 py-4 bg-red-500/20 border border-red-500/40 backdrop-blur-xl rounded-2xl text-red-300 font-bold shadow-xl"
            >
                <AlertCircle size={20} />
                {message}
            </Motion.div>
        )}
    </AnimatePresence>
);

export default ErrorToast;

