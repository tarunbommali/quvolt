import React from 'react';
import { Search, Plus, LayoutGrid, List, Settings2 } from 'lucide-react';

const StudioDashboardToolbar = ({
    showCreate,
    onToggleCreate,
    onGlobalDefaults,
    viewMode,
    onViewModeChange,
    sortMode,
    onSortModeChange,
    filterMode,
    onFilterModeChange,
    searchQuery,
    onSearchQueryChange
}) => {
    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between py-6 px-1">
            <div className="flex-1 max-w-xl relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input
                    type="text"
                    placeholder="Search your projects..."
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                />
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => onViewModeChange('grid')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        title="Grid View"
                    >
                        <LayoutGrid size={18} />
                    </button>
                    <button
                        onClick={() => onViewModeChange('list')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        title="List View"
                    >
                        <List size={18} />
                    </button>
                </div>

                <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden md:block" />

                <button
                    onClick={onGlobalDefaults}
                    title="Global session defaults"
                    className="flex items-center gap-2 px-3.5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl font-semibold transition-all shadow-sm active:scale-95"
                >
                    <Settings2 size={17} />
                </button>

                <button
                    onClick={onToggleCreate}
                    className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                >
                    <Plus size={18} />
                    <span>{showCreate ? 'Close' : 'Create Template'}</span>
                </button>
            </div>
        </div>
    );
};

export default StudioDashboardToolbar;

