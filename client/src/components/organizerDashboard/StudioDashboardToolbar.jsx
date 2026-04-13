import { ArrowUpDown, LayoutGrid, List, Plus, SlidersHorizontal } from 'lucide-react';
import LivePulseBadge from '../ui/LivePulseBadge';
import { components } from '../../styles/components';
import { cx } from '../../styles/theme';

/**
 * Toolbar for the studio dashboard.
 * @param {{
 *   userName: string,
 *   currentSubject: { title?: string } | null,
 *   liveSessionCount: number,
 *   showCreate: boolean,
 *   onToggleCreate: () => void,
 *   viewMode: string,
 *   onViewModeChange: (mode: string) => void,
 *   isMobileView: boolean,
 *   sortMode: string,
 *   onSortModeChange: (mode: string) => void,
 *   filterMode: string,
 *   onFilterModeChange: (mode: string) => void,
 *   searchQuery: string,
 *   onSearchQueryChange: (value: string) => void,
 * }} props
 */
const StudioDashboardToolbar = ({
    userName,
    currentSubject,
    liveSessionCount,
    showCreate,
    onToggleCreate,
    viewMode,
    onViewModeChange,
    isMobileView,
    sortMode,
    onSortModeChange,
    filterMode,
    onFilterModeChange,
    searchQuery,
    onSearchQueryChange,
}) => {
    const title = currentSubject ? currentSubject.title : 'Studio';
    const subtitle = currentSubject ? 'Manage quizzes in this folder' : 'Manage your quizzes';

    return (
        <div className={components.studio.controlBar}>
            <div className={components.studio.controlInner}>
                <div className={components.studio.headingWrap}>
                    {currentSubject ? <p className={components.studio.crumb}>Studio / {currentSubject.title}</p> : null}
                    <h1 className={components.studio.title}>{title}</h1>
                    <p className={components.studio.subtitle}>{subtitle}</p>
                    <LivePulseBadge count={liveSessionCount} label="sessions live" />
                    {!currentSubject ? (
                        <p className={components.studio.welcomeText}>
                            Welcome back, <span className={components.studio.welcomeName}>{userName}</span>
                        </p>
                    ) : null}
                </div>

                <div className={components.studio.centerControlsWrap}>
                    <div className={components.studio.segmentedShell}>
                        <div className={components.studio.segmentedInner}>
                            <button
                                type="button"
                                onClick={() => onViewModeChange('grid')}
                                disabled={isMobileView}
                                className={cx(
                                    components.studio.modeBtnBase,
                                    viewMode === 'grid' ? components.studio.modeBtnActive : components.studio.modeBtnIdle,
                                    components.studio.modeBtnDisabled,
                                )}
                                aria-pressed={viewMode === 'grid'}
                            >
                                <LayoutGrid size={14} /> Grid
                            </button>
                            <button
                                type="button"
                                onClick={() => onViewModeChange('list')}
                                className={cx(
                                    components.studio.modeBtnBase,
                                    viewMode === 'list' ? components.studio.modeBtnActive : components.studio.modeBtnIdle,
                                )}
                                aria-pressed={viewMode === 'list'}
                            >
                                <List size={14} /> List
                            </button>
                        </div>

                        <label className={components.studio.sortFilterLabel}>
                            <ArrowUpDown size={13} />
                            <span>Sort</span>
                            <select
                                value={sortMode}
                                onChange={(event) => onSortModeChange(event.target.value)}
                                className={components.studio.sortFilterSelect}
                                aria-label="Sort quiz templates"
                            >
                                <option value="activity">Activity (Latest)</option>
                                <option value="newest">Newest</option>
                                <option value="oldest">Oldest</option>
                            </select>
                        </label>

                        <label className={components.studio.sortFilterLabel}>
                            <SlidersHorizontal size={13} />
                            <span>Filter</span>
                            <select
                                value={filterMode}
                                onChange={(event) => onFilterModeChange(event.target.value)}
                                className={components.studio.sortFilterSelect}
                                aria-label="Filter quiz templates"
                            >
                                <option value="all">All</option>
                                <option value="public">Public</option>
                                <option value="private">Private</option>
                                <option value="live">Live</option>
                            </select>
                        </label>
                    </div>
                </div>

                <div className={components.studio.actionWrap}>
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(event) => onSearchQueryChange(event.target.value)}
                        placeholder="Search templates"
                        className={components.studio.searchInput}
                        aria-label="Search templates"
                    />

                    <button
                        type="button"
                        onClick={onToggleCreate}
                        className={components.studio.newBtn}
                    >
                        <Plus size={16} />
                        {showCreate ? 'Close Menu' : 'New Template'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudioDashboardToolbar;
