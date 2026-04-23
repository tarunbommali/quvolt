import React from 'react';
import { ChevronLeft, LayoutGrid, List, Plus, X } from 'lucide-react';
import { textStyles, components } from '../../../styles/index';

const SubjectBanner = ({ currentSubject, showCreate, onBack, onToggleAddQuiz, viewMode, onViewModeChange, isMobileView }) => {
    if (!currentSubject) return null;

    return (
        <div className={`${components.analytics.card} !p-6 !rounded-[2.5rem] flex items-center gap-6 border theme-border bg-gradient-to-r from-indigo-500/[0.03] to-purple-500/[0.03]`}>
            <button 
                onClick={onBack} 
                className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 border theme-border flex items-center justify-center theme-text-primary hover:bg-gray-50 dark:hover:bg-white/10 transition-all shadow-sm group"
            >
                <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] theme-text-muted opacity-60 mb-1">Subject Module</p>
                <h2 className={textStyles.value2Xl + " !font-black !text-2xl theme-text-primary"}>{currentSubject.title}</h2>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center bg-gray-100 dark:bg-white/5 p-1 rounded-xl border theme-border">
                    <button
                        onClick={() => onViewModeChange('grid')}
                        disabled={isMobileView}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-white/10 theme-text-primary shadow-sm' : 'theme-text-muted hover:theme-text-primary opacity-50'}`}
                    >
                        <LayoutGrid size={16} />
                    </button>
                    <button
                        onClick={() => onViewModeChange('list')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-white/10 theme-text-primary shadow-sm' : 'theme-text-muted hover:theme-text-primary'}`}
                    >
                        <List size={16} />
                    </button>
                </div>
                <button
                    onClick={onToggleAddQuiz}
                    className={`${components.button.base} ${components.button.sizes.md} ${showCreate ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' : components.button.variants.primary} !rounded-2xl px-6 flex items-center gap-2 font-black uppercase tracking-widest text-[11px] shadow-lg h-12`}
                >
                    {showCreate ? <X size={14} /> : <Plus size={14} />}
                    <span>{showCreate ? 'Cancel' : 'Add Template'}</span>
                </button>
            </div>
        </div>
    );
};

export default SubjectBanner;

