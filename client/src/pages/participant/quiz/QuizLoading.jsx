import React from 'react';
import { Loader2 } from 'lucide-react';
import { Shell, CenterCard } from './QuizLayouts';

const QuizLoading = ({ code }) => {
    return (
        <Shell>
            <CenterCard>
                <div className="flex flex-col items-center gap-5 text-center">
                    <div className="w-14 h-14 rounded-2xl theme-status-info flex items-center justify-center">
                        <Loader2 size={28} className="animate-spin" />
                    </div>
                    <div>
                        <p className="font-black theme-text-primary">Syncing Session</p>
                        <p className="text-sm theme-text-secondary mt-1">
                            Joining <span className="font-black text-[var(--qb-primary)]">{code?.toUpperCase() || '...'}</span>…
                        </p>
                    </div>
                </div>
            </CenterCard>
        </Shell>
    );
};

export default QuizLoading;
