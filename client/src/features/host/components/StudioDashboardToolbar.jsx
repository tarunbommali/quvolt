import React from 'react';
import { Search, Plus, LayoutGrid, List, X } from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import { textStyles, controlStyles, components, forms, buttonStyles, cx } from '../../../styles/index';

const StudioDashboardToolbar = ({
    showCreate,
    onToggleCreate,
    viewMode,
    onViewModeChange,
    searchQuery,
    onSearchQueryChange
}) => {
    return (
        <div className={`${components.studio.controlInner} `}>
            {/* LEFT: Search Input */}
            <div className={cx(forms.searchWrap, "flex-1 max-w-xl group")}>
                <Search
                    className={cx(
                        forms.searchIcon,
                        "group-focus-within:text-indigo-500 transition-colors"
                    )}
                    size={18}
                />
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    className={cx(
                        forms.inputField,
                        "!pl-14 !h-14 !rounded-2xl shadow-sm focus:ring-[var(--qb-primary)]/10"
                    )}
                />
            </div>

            {/* RIGHT: View Toggles & Actions */}
            <div className="flex items-center gap-4">
                <div className="flex items-center bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl border theme-border">
                    <button
                        onClick={() => onViewModeChange('grid')}
                        className={cx(
                            controlStyles.iconButton,
                            "!p-2.5 !rounded-xl",
                            viewMode === 'grid' ? "bg-white dark:bg-white/10 theme-text-primary shadow-md" : "theme-text-muted"
                        )}
                        title="Grid View"
                    >
                        <LayoutGrid size={20} />
                    </button>
                    <button
                        onClick={() => onViewModeChange('list')}
                        className={cx(
                            controlStyles.iconButton,
                            "!p-2.5 !rounded-xl",
                            viewMode === 'list' ? "bg-white dark:bg-white/10 theme-text-primary shadow-md" : "theme-text-muted"
                        )}
                        title="List View"
                    >
                        <List size={20} />
                    </button>
                </div>

            </div>
        </div>
    );
};

export default StudioDashboardToolbar;
