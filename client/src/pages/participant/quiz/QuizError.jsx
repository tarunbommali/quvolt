import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Shell, CenterCard, Card } from './QuizLayouts';

const QuizError = ({ message, onRetry }) => {
    const navigate = useNavigate();

    return (
        <Shell>
            <CenterCard>
                <Card className="text-center space-y-5">
                    <div className="w-12 h-12 rounded-2xl theme-status-danger flex items-center justify-center mx-auto">
                        <AlertCircle size={22} />
                    </div>
                    <div>
                        <p className="font-black theme-text-primary">Something went wrong</p>
                        <p className="text-sm theme-tone-danger mt-1 font-semibold">{message || 'An unexpected error occurred.'}</p>
                    </div>
                    <button
                        onClick={onRetry || (() => navigate('/join'))}
                        className="w-full h-11 rounded-xl bg-[var(--qb-primary)] hover:bg-[var(--qb-primary-strong)] text-white text-sm font-bold transition-colors"
                    >
                        Back to Join
                    </button>
                </Card>
            </CenterCard>
        </Shell>
    );
};

export default QuizError;
