import React from 'react';
import { SUPPORTED_LANGUAGES } from '../../utils/supportedLanguages';
import { cx } from '../../styles/index';

const LanguagePill = ({ languageCode, onClick }) => {
    if (!languageCode) return null;
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === languageCode);
    if (!lang) return null;

    return (
        <button 
            onClick={onClick}
            className={cx(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider",
                "bg-[var(--qb-primary)]/10 text-[var(--qb-primary)] border border-[var(--qb-primary)]/20",
                "transition-opacity hover:opacity-80 shadow-sm"
            )}
            title={`Quiz displayed in ${lang.label}`}
        >
            <span>{lang.flag}</span>
            <span>{lang.native}</span>
        </button>
    );
};

export default LanguagePill;
