import React from 'react';
import { Search, Plus, LayersPlus } from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import { forms, buttonStyles, cx } from '../../../styles/index';

const WorkspaceDashboardToolbar = ({
    showCreate,
    onToggleCreate,
    onSearchQueryChange,
    searchQuery,
    currentSubject,
}) => {
    return (
        <div className="flex    gap-4 items-center justify-between mb-6">
            {/* LEFT: Search Input */}
            <div className={cx(forms.searchWrap, 'w-full md:w-80')}>
                <div className={cx(forms.searchIcon)}>
                    <Search size={15} />
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search sessions…"
                    className={cx(forms.inputField, 'pl-9')}
                />
            </div>


            {/* Right Icon */}
            <button
                onClick={onToggleCreate}
                className={cx(buttonStyles.base, buttonStyles.filledButton, "hover:transition-all hover:scale-110")}
            >
                <LayersPlus size={22} color="var(--qb-primary)" /> Create Template
            </button>

        </div>
    );
};

export default WorkspaceDashboardToolbar;
