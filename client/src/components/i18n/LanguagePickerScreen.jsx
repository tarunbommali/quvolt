import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../../utils/supportedLanguages';
import { typography, cx } from '../../styles/index';

const LanguagePickerScreen = ({ quiz, onSelectLanguage }) => {
    const defaultLang = quiz?.defaultLanguage || 'en';
    const availableLangs = quiz?.availableLanguages || ['en'];
    
    // Default to the default language or null if forced selection is required
    const [selected, setSelected] = useState(null);

    const handleContinue = () => {
        if (selected) onSelectLanguage(selected);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center theme-bg theme-text-primary p-4 overflow-y-auto">
            <div className="w-full max-w-lg theme-surface border theme-border shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-8 pb-6 text-center border-b theme-border bg-[var(--qb-primary)]/5">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--qb-primary)]/10 text-[var(--qb-primary)] mb-6 shadow-sm">
                        <Globe size={32} />
                    </div>
                    <h1 className={cx(typography.h2, "mb-3")}>Choose your language</h1>
                    <p className="text-sm font-medium theme-text-muted max-w-sm mx-auto leading-relaxed">
                        अपनी भाषा चुनें • మీ భాష ఎంచుకోండి • உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்
                    </p>
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-2 gap-3 mb-8">
                        {availableLangs.map(code => {
                            const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
                            if (!lang) return null;
                            const isSelected = selected === code;
                            
                            return (
                                <button
                                    key={code}
                                    onClick={() => setSelected(code)}
                                    className={cx(
                                        "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all hover:-translate-y-0.5",
                                        isSelected 
                                            ? "border-[var(--qb-primary)] bg-[var(--qb-primary)]/5 shadow-md" 
                                            : "theme-border theme-surface-soft hover:theme-border-hover"
                                    )}
                                >
                                    <span className="text-3xl mb-2">{lang.flag}</span>
                                    <span className="text-[15px] font-bold theme-text-primary">{lang.native}</span>
                                    <span className="text-[11px] font-semibold tracking-wider theme-text-muted uppercase mt-1">{lang.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={handleContinue}
                        disabled={!selected}
                        className="w-full py-4 px-6 rounded-2xl font-bold text-[15px] bg-[var(--qb-primary)] text-white shadow-lg shadow-[var(--qb-primary)]/20 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        Continue <span aria-hidden="true">→</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LanguagePickerScreen;
