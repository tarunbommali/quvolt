import { useState } from 'react';
import { ArrowUpDown, LayoutGrid, List, Plus, SlidersHorizontal } from 'lucide-react';
import { components } from '../../styles/components';
import { cx } from '../../styles/theme';

/**
 * Toolbar for the studio dashboard.
 * @param {{
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
    const [isMobileControlsOpen, setIsMobileControlsOpen] = useState(false);

    return (
        <div className={components.studio.controlBar}>
            <div className={components.studio.controlInner}>
                <div className={components.studio.searchWrap}>
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(event) => onSearchQueryChange(event.target.value)}
                        placeholder="Search quizzes, templates, or session codes..."
                        className={components.studio.searchInput}
                        aria-label="Search quizzes, templates, or session codes"
                    />
                </div>

                <div className={components.studio.actionWrap}>
                    <div className={components.studio.controlsRow}>
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
                        </div>

                        <label className={components.studio.sortFilterLabel}>
                            <ArrowUpDown size={13} />
                            <select
                                value={sortMode}
                                onChange={(event) => onSortModeChange(event.target.value)}
                                className={components.studio.sortFilterSelect}
                                aria-label="Sort quiz templates"
                            >
                                <option value="activity">Activity</option>
                                <option value="newest">Newest</option>
                                <option value="oldest">Oldest</option>
                            </select>
                        </label>

                        <label className={components.studio.sortFilterLabel}>
                            <SlidersHorizontal size={13} />
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

                    <div className={components.studio.mobileControlsWrap}>
                        <button
                            type="button"
                            className={components.studio.mobileControlsTrigger}
                            onClick={() => setIsMobileControlsOpen((prev) => !prev)}
                            aria-expanded={isMobileControlsOpen}
                            aria-label="Open studio controls"
                        >
                            <SlidersHorizontal size={14} />
                            Controls
                        </button>

                        {isMobileControlsOpen ? (
                            <div className={components.studio.mobileControlsMenu}>
                                <div className={components.studio.mobileControlsSection}>
                                    <div className={components.studio.segmentedShell}>
                                        <div className={components.studio.segmentedInner}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onViewModeChange('grid');
                                                    setIsMobileControlsOpen(false);
                                                }}
                                                className={cx(
                                                    components.studio.modeBtnBase,
                                                    viewMode === 'grid' ? components.studio.modeBtnActive : components.studio.modeBtnIdle,
                                                )}
                                                aria-pressed={viewMode === 'grid'}
                                            >
                                                <LayoutGrid size={14} /> Grid
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onViewModeChange('list');
                                                    setIsMobileControlsOpen(false);
                                                }}
                                                className={cx(
                                                    components.studio.modeBtnBase,
                                                    viewMode === 'list' ? components.studio.modeBtnActive : components.studio.modeBtnIdle,
                                                )}
                                                aria-pressed={viewMode === 'list'}
                                            >
                                                <List size={14} /> List
                                            </button>
                                        </div>
                                    </div>

                                    <label className={components.studio.sortFilterLabel}>
                                        <ArrowUpDown size={13} />
                                        <select
                                            value={sortMode}
                                            onChange={(event) => {
                                                onSortModeChange(event.target.value);
                                                setIsMobileControlsOpen(false);
                                            }}
                                            className={components.studio.sortFilterSelect}
                                            aria-label="Sort quiz templates"
                                        >
                                            <option value="activity">Activity</option>
                                            <option value="newest">Newest</option>
                                            <option value="oldest">Oldest</option>
                                        </select>
                                    </label>

                                    <label className={components.studio.sortFilterLabel}>
                                        <SlidersHorizontal size={13} />
                                        <select
                                            value={filterMode}
                                            onChange={(event) => {
                                                onFilterModeChange(event.target.value);
                                                setIsMobileControlsOpen(false);
                                            }}
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
                        ) : null}
                    </div>

                    <button
                        type="button"
                        onClick={onToggleCreate}
                        className={components.studio.newBtn}
                    >
                        <Plus size={16} />
                        New Template
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudioDashboardToolbar;
