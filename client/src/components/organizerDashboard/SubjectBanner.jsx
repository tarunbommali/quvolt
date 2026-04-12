import { ChevronLeft, LayoutGrid, List, Plus } from 'lucide-react';
import { controlStyles, textStyles } from '../../styles/commonStyles';
import { layoutStyles } from '../../styles/layoutStyles';
import { buttonStyles } from '../../styles/buttonStyles';

const SubjectBanner = ({ currentSubject, showCreate, onBack, onToggleAddQuiz, viewMode, onViewModeChange, isMobileView }) => {
    if (!currentSubject) return null;

    return (
        <div className={`${layoutStyles.sectionSurface} flex items-center gap-6 animate-in slide-in-from-left`}>
            <button onClick={onBack} className="ui-icon-btn min-h-12 min-w-12 rounded-2xl bg-gray-100 border-transparent hover:bg-gray-200">
                <ChevronLeft />
            </button>
            <div>
                <h2 className="text-3xl font-black text-indigo-700 leading-none">{currentSubject.title}</h2>
                <p className={`${textStyles.overline} mt-1`}>Management Chamber // Sub-directory</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
                <div className={controlStyles.segmented} role="group" aria-label="View mode">
                    <button
                        type="button"
                        onClick={() => onViewModeChange('grid')}
                        disabled={isMobileView}
                        className={`${controlStyles.segmentedButton} ${viewMode === 'grid' ? controlStyles.segmentedActive : controlStyles.segmentedIdle} disabled:cursor-not-allowed disabled:opacity-50`}
                        aria-pressed={viewMode === 'grid'}
                    >
                        <LayoutGrid size={14} /> Grid
                    </button>
                    <button
                        type="button"
                        onClick={() => onViewModeChange('list')}
                        className={`${controlStyles.segmentedButton} ${viewMode === 'list' ? controlStyles.segmentedActive : controlStyles.segmentedIdle}`}
                        aria-pressed={viewMode === 'list'}
                    >
                        <List size={14} /> List
                    </button>
                </div>
                <button
                    onClick={onToggleAddQuiz}
                    className={`${buttonStyles.primary} inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-xs font-bold shadow-sm transition-all`}
                >
                    <Plus size={16} /> {showCreate ? 'CANCEL' : 'ADD QUIZ'}
                </button>
            </div>
        </div>
    );
};

export default SubjectBanner;
