import { LayoutGrid, List, Plus } from 'lucide-react';
import { controlStyles, textStyles } from '../../styles/commonStyles';
import { layoutStyles } from '../../styles/layoutStyles';
import { buttonStyles } from '../../styles/buttonStyles';

const DashboardHeader = ({ userName, currentSubject, showCreate, onToggleCreate, viewMode, onViewModeChange, isMobileView }) => (
    <div className={layoutStyles.dashboardHeader}>
        <div className="page-header">
            <h1 className="page-title">STUDIO</h1>
            <p className="page-subtitle">Welcome back, <span className={textStyles.emphasis}>{userName}</span></p>
        </div>
        {!currentSubject && (
            <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
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
                <button onClick={onToggleCreate} className={`${buttonStyles.premium} px-7 py-3.5 group`}>
                    <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                    {showCreate ? 'Close Menu' : 'New Template'}
                </button>
            </div>
        )}
    </div>
);

export default DashboardHeader;
