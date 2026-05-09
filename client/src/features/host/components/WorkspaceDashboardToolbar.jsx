import React from 'react';
import { Search, Plus, LayoutGrid, List, X, Trophy, Table } from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import { textStyles, controlStyles, components, forms, buttonStyles, cx } from '../../../styles/index';

const WorkspaceDashboardToolbar = ({
    showCreate,
    onToggleCreate,
    viewMode,
    onViewModeChange,
    onSearchQueryChange,
    searchQuery,
    folderId,
    onOpenAnalytics,
    isMasteryMode,
    onToggleMastery
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

                {folderId && (
                    <button
                        onClick={onToggleMastery}
                        className={cx(
                            "flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all text-[11px] font-black uppercase tracking-widest",
                            isMasteryMode 
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400 shadow-sm" 
                                : "bg-white dark:bg-white/5 theme-border theme-text-muted hover:theme-text-primary"
                        )}
                        title={isMasteryMode ? "Modular Mode: On" : "Enable Modular Mode"}
                    >
                        <Table size={16} />
                        Modular Mode
                    </button>
                )}

                {folderId && (
                    <Motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onOpenAnalytics}
                        className={cx(
                            buttonStyles.base,
                            "bg-indigo-600 hover:bg-indigo-700 text-white !px-6 !py-3 !rounded-2xl shadow-lg shadow-indigo-500/20 flex items-center gap-2 text-xs font-black uppercase tracking-widest"
                        )}
                    >
                        <Trophy size={16} />
                        Session Analytics
                    </Motion.button>
                )}
            </div>
        </div>
    );
};

export default WorkspaceDashboardToolbar;
