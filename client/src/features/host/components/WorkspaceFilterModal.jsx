import React from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { X, LayoutGrid, List, Clock, AlignLeft, Calendar } from 'lucide-react';
import { textStyles, buttonStyles, controlStyles, cx, forms, typography } from '../../../styles';

const SortOption = ({ id, label, icon: Icon, isSelected, onClick }) => (
    <button
        onClick={() => onClick(id)}
        className={cx(
            "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all",
            isSelected 
                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold" 
                : "hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 font-medium"
        )}
    >
        <div className="flex items-center gap-3">
            <Icon size={18} className={isSelected ? "text-indigo-500" : "opacity-60"} />
            {label}
        </div>
        {isSelected && (
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
        )}
    </button>
);

const WorkspaceFilterModal = ({
    isOpen,
    onClose,
    viewMode,
    onViewModeChange,
    sortMode,
    onSortModeChange,
    dateRange,
    onDateRangeChange,
    activeFilterCount,
}) => {
    if (!isOpen) return null;

    const handleClearDateRange = () => {
        onDateRangeChange({ startDate: '', endDate: '' });
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
                <Motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                />
                
                <Motion.div
                    initial={{ opacity: 0, y: 100, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h2 className={textStyles.h3}>View Options</h2>
                            {activeFilterCount > 0 && (
                                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-black">
                                    {activeFilterCount}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className={cx(controlStyles.iconButton, "p-2")}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto space-y-8">
                        
                        {/* View Layout */}
                        <div className="space-y-4">
                            <h3 className={cx(typography.metaLabel, "text-gray-400 dark:text-gray-500")}>Layout</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => onViewModeChange('grid')}
                                    className={cx(
                                        "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all",
                                        viewMode === 'grid' 
                                            ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" 
                                            : "border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 text-gray-500"
                                    )}
                                >
                                    <LayoutGrid size={24} />
                                    <span className="font-semibold text-sm">Grid</span>
                                </button>
                                <button
                                    onClick={() => onViewModeChange('list')}
                                    className={cx(
                                        "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all",
                                        viewMode === 'list' 
                                            ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" 
                                            : "border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 text-gray-500"
                                    )}
                                >
                                    <List size={24} />
                                    <span className="font-semibold text-sm">List</span>
                                </button>
                            </div>
                        </div>

                        {/* Sort Order */}
                        <div className="space-y-4">
                            <h3 className={cx(typography.metaLabel, "text-gray-400 dark:text-gray-500")}>Sort By</h3>
                            <div className="space-y-1">
                                <SortOption 
                                    id="createdAt_desc" 
                                    label="Newest First" 
                                    icon={Clock} 
                                    isSelected={sortMode === 'createdAt_desc'} 
                                    onClick={onSortModeChange} 
                                />
                                <SortOption 
                                    id="createdAt_asc" 
                                    label="Oldest First" 
                                    icon={Calendar} 
                                    isSelected={sortMode === 'createdAt_asc'} 
                                    onClick={onSortModeChange} 
                                />
                                <SortOption 
                                    id="title_asc" 
                                    label="Alphabetical (A-Z)" 
                                    icon={AlignLeft} 
                                    isSelected={sortMode === 'title_asc'} 
                                    onClick={onSortModeChange} 
                                />
                            </div>
                        </div>

                        {/* Date Filter */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className={cx(typography.metaLabel, "text-gray-400 dark:text-gray-500")}>Filter by Date</h3>
                                {(dateRange?.startDate || dateRange?.endDate) && (
                                    <button 
                                        onClick={handleClearDateRange}
                                        className={cx(typography.micro, "text-indigo-500 hover:text-indigo-600 transition-colors")}
                                    >
                                        Clear Dates
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className={cx(typography.micro, "text-gray-500 dark:text-gray-400 block")}>Start Date</label>
                                    <input 
                                        type="date"
                                        value={dateRange?.startDate || ''}
                                        onChange={(e) => onDateRangeChange({ ...dateRange, startDate: e.target.value })}
                                        className={cx(forms.inputField, "w-full !px-3 !py-2.5 !rounded-xl !text-sm")}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={cx(typography.micro, "text-gray-500 dark:text-gray-400 block")}>End Date</label>
                                    <input 
                                        type="date"
                                        value={dateRange?.endDate || ''}
                                        onChange={(e) => onDateRangeChange({ ...dateRange, endDate: e.target.value })}
                                        min={dateRange?.startDate || ''}
                                        className={cx(forms.inputField, "w-full !px-3 !py-2.5 !rounded-xl !text-sm")}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                        <button
                            onClick={onClose}
                            className={cx(buttonStyles.base, buttonStyles.primary, buttonStyles.sizeLg, "w-full !rounded-2xl")}
                        >
                            Apply Preferences
                        </button>
                    </div>
                </Motion.div>
            </div>
        </AnimatePresence>
    );
};

export default WorkspaceFilterModal;
