import { memo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';

const ResultFeedback = ({ myResult }) => {
    return (
        <AnimatePresence>
            {myResult && (
                <div
                    role="status"
                    aria-live="polite"
                    className={`qr-card rounded-xl p-8 text-center space-y-2 border ${
                        myResult.isCorrect
                            ? 'border-green-500 bg-green-50'
                            : 'border-red-500 bg-red-50'
                    }`}
                >
                    <div
                        className={`flex items-center justify-center gap-4 ${
                            myResult.isCorrect ? 'text-green-600' : 'text-red-500'
                        }`}
                    >
                        {myResult.isCorrect ? (
                            <CheckCircle2 size={40} />
                        ) : (
                            <XCircle size={40} />
                        )}
                        <span className="text-2xl font-medium tracking-tight">
                            {myResult.isCorrect ? `Awesome! +${myResult.score}` : 'Wrong answer'}
                        </span>
                    </div>
                    <p className="text-slate-500 font-medium text-xs">
                        Waiting for the next question...
                    </p>
                    {myResult.streak !== undefined && (
                        <p className="text-xs font-medium text-emerald-600">
                            Current streak: {myResult.streak}
                            {myResult.bestStreak ? ` · Best: ${myResult.bestStreak}` : ''}
                        </p>
                    )}
                </div>
            )}
        </AnimatePresence>
    );
};

export default memo(ResultFeedback);
