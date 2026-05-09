import React, { useState } from 'react';
import { Globe, Languages, Wand2, X } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../../utils/supportedLanguages';
import { typography, layout, cx, cards } from '../../styles/index';
import apiClient from '../../services/apiClient';
import TranslationDrawer from './TranslationDrawer';

const LanguageSettingsPanel = ({ quiz, updateQuiz, isSaving }) => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    
    // Fallbacks
    const defaultLang = quiz.defaultLanguage || 'en';
    const availableLangs = quiz.availableLanguages || ['en'];
    const requireSelection = quiz.requireLanguageSelection !== false;

    const handleToggleLang = (code) => {
        if (code === defaultLang) return; // Cannot disable default language
        const newLangs = availableLangs.includes(code)
            ? availableLangs.filter(l => l !== code)
            : [...availableLangs, code];
        updateQuiz({ availableLanguages: newLangs });
    };

    const handleDefaultLangChange = (code) => {
        const newLangs = availableLangs.includes(code) ? availableLangs : [...availableLangs, code];
        updateQuiz({ defaultLanguage: code, availableLanguages: newLangs });
    };

    const translateAll = async () => {
        // [I18N] Calls API to translate all slides
        const targetLangs = availableLangs.filter(l => l !== defaultLang);
        if (!targetLangs.length) return alert('Enable at least one extra language first.');
        
        try {
            const res = await apiClient.post(`/quiz/${quiz._id}/translate`, {
                slideIds: ['all'],
                targetLanguages: targetLangs,
                sourceLanguage: defaultLang
            });
            if (res.data?.success || res.status === 200) {
                // trigger a full reload or apply state
                window.location.reload();
            } else {
                alert('Translation failed.');
            }
        } catch (e) {
            console.error(e);
            alert('Failed to translate.');
        }
    };

    return (
        <div className="pt-6 mt-6 border-t theme-border space-y-5">
            <div>
                <h3 className={cx(typography.metaLabel, 'mb-3 flex items-center gap-2')}>
                    <Globe size={14} /> LANGUAGE SETTINGS [I18N]
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className={cx(typography.micro, 'mb-1.5 block')}>Default Language</label>
                        <select 
                            value={defaultLang}
                            onChange={(e) => handleDefaultLangChange(e.target.value)}
                            className="w-full h-10 theme-surface border theme-border rounded-xl px-3 text-sm focus:border-[var(--qb-primary)] outline-none"
                        >
                            {SUPPORTED_LANGUAGES.map(lang => (
                                <option key={lang.code} value={lang.code}>{lang.native} ({lang.label})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={cx(typography.micro, 'mb-2 block')}>Available Languages</label>
                        <div className="grid grid-cols-2 gap-2">
                            {SUPPORTED_LANGUAGES.map(lang => (
                                <label key={lang.code} className="flex items-center gap-2 text-sm theme-text-primary cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-gray-300 text-[var(--qb-primary)] focus:ring-[var(--qb-primary)]"
                                        checked={availableLangs.includes(lang.code)}
                                        disabled={lang.code === defaultLang}
                                        onChange={() => handleToggleLang(lang.code)}
                                    />
                                    <span>{lang.native}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm theme-text-primary mt-4 cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-[var(--qb-primary)] focus:ring-[var(--qb-primary)]"
                            checked={requireSelection}
                            onChange={(e) => updateQuiz({ requireLanguageSelection: e.target.checked })}
                        />
                        <span>Require selection before join</span>
                    </label>
                </div>
            </div>

            <div className="pt-4 border-t theme-border">
                <h3 className={cx(typography.metaLabel, 'mb-3 flex items-center gap-2')}>
                    <Languages size={14} /> TRANSLATE QUESTIONS [I18N]
                </h3>
                <div className="space-y-2">
                    <button 
                        onClick={translateAll}
                        disabled={isSaving}
                        className="w-full h-10 rounded-xl bg-[var(--qb-primary)]/10 text-[var(--qb-primary)] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[var(--qb-primary)]/20 transition-colors disabled:opacity-50"
                    >
                        <Wand2 size={16} /> AI Translate All Slides ✦
                    </button>
                    <button 
                        onClick={() => setIsDrawerOpen(true)}
                        className="w-full h-10 rounded-xl border theme-border text-sm font-medium flex items-center justify-center hover:theme-surface transition-colors"
                    >
                        Manual Edit Translations
                    </button>
                </div>
            </div>

            {isDrawerOpen && (
                <TranslationDrawer 
                    quiz={quiz} 
                    updateQuiz={updateQuiz} 
                    onClose={() => setIsDrawerOpen(false)} 
                />
            )}
        </div>
    );
};

export default LanguageSettingsPanel;
