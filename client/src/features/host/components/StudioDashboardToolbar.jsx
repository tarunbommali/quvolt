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
        <div className={components.studio.controlInner}>
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
                    placeholder="Search templates, folders, or tags..."
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

                <div className="h-10 w-[1px] theme-border border-r mx-1 hidden md:block opacity-20" />

                <Motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onToggleCreate}
                    className={cx(
                        buttonStyles.base,
                        showCreate ? "!bg-red-500 !text-white !shadow-red-500/20" : buttonStyles.primary,
                        "!h-14 !px-8 !rounded-2xl flex items-center gap-3 !text-xs !font-black !uppercase !tracking-widest shadow-xl"
                    )}
                >
                    {showCreate ? <X size={20} /> : <Plus size={20} />}
                    <span>{showCreate ? 'Cancel' : 'New Template'}</span>
                </Motion.button>
            </div>
        </div>
    );
};

export default StudioDashboardToolbar;
