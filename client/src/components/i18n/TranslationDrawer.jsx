import React, { useState, useCallback } from 'react';
import { X, Wand2, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { typography, cx } from '../../styles/index';
import { SUPPORTED_LANGUAGES } from '../../utils/supportedLanguages';

const TranslationDrawer = ({ quiz, updateQuiz, onClose }) => {
    // Only show tabs for enabled languages (excluding default)
    const defaultLang = quiz.defaultLanguage || 'en';
    const targetLangs = (quiz.availableLanguages || []).filter(l => l !== defaultLang);
    
    const [activeTab, setActiveTab] = useState(targetLangs[0] || null);
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    // Deep-clone questions into local editing state
    const [editedQuestions, setEditedQuestions] = useState(() =>
        JSON.parse(JSON.stringify(quiz.questions || []))
    );

    const slide = editedQuestions[activeSlideIndex];
    if (!slide) return null;

    const sourceData = {
        question: slide.text || slide.question || '',
        options: slide.options || []
    };

    // Read current translation for active tab (mutable local copy)
    const translationsMap = slide.translations || {};
    const targetData = translationsMap[activeTab] || {
        text: '',
        options: (slide.options || []).map(() => '')
    };

    // ── Handlers ────────────────────────────────────────────────────────────

    const updateTranslationField = useCallback((field, value) => {
        setEditedQuestions(prev => {
            const updated = [...prev];
            const q = { ...updated[activeSlideIndex] };
            const trans = { ...(q.translations || {}) };
            const langEntry = { ...(trans[activeTab] || { text: '', options: [] }) };

            if (field === 'text') {
                langEntry.text = value;
            } else if (field.startsWith('option_')) {
                const idx = parseInt(field.split('_')[1], 10);
                const opts = [...(langEntry.options || [])];
                opts[idx] = value;
                langEntry.options = opts;
            }

            trans[activeTab] = langEntry;
            q.translations = trans;
            updated[activeSlideIndex] = q;
            return updated;
        });
    }, [activeSlideIndex, activeTab]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Build a questions payload with only the translations updated
            const questionsPayload = editedQuestions.map((q, i) => {
                const original = quiz.questions[i] || {};
                return {
                    ...original,
                    translations: q.translations || original.translations || {},
                };
            });
            await updateQuiz({ questions: questionsPayload });
            onClose();
        } catch {
            // Keep drawer open on error so user doesn't lose work
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-y-0 right-0 w-[600px] theme-bg border-l theme-border shadow-2xl z-50 flex flex-col">
            <div className="h-16 px-6 border-b theme-border flex items-center justify-between shrink-0">
                <h2 className={typography.h3}>Translate Questions</h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="flex border-b theme-border overflow-x-auto">
                {targetLangs.map(code => {
                    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
                    return (
                        <button
                            key={code}
                            onClick={() => setActiveTab(code)}
                            className={cx(
                                "px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                                activeTab === code 
                                    ? "border-[var(--qb-primary)] text-[var(--qb-primary)]" 
                                    : "border-transparent theme-text-muted hover:theme-text-primary"
                            )}
                        >
                            {lang?.native || code}
                        </button>
                    );
                })}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {targetLangs.length === 0 ? (
                    <p className="text-center text-sm theme-text-muted mt-10">No additional languages enabled.</p>
                ) : (
                    <>
                        <div className="flex justify-between items-center">
                            <h3 className={typography.h4}>Slide {activeSlideIndex + 1} of {editedQuestions.length}</h3>
                            <div className="flex gap-2">
                                <button 
                                    disabled={activeSlideIndex === 0}
                                    onClick={() => setActiveSlideIndex(i => i - 1)}
                                    className="px-3 py-1 text-sm border theme-border rounded hover:theme-surface disabled:opacity-50 flex items-center gap-1"
                                >
                                    <ChevronLeft size={14} /> Prev
                                </button>
                                <button 
                                    disabled={activeSlideIndex === editedQuestions.length - 1}
                                    onClick={() => setActiveSlideIndex(i => i + 1)}
                                    className="px-3 py-1 text-sm border theme-border rounded hover:theme-surface disabled:opacity-50 flex items-center gap-1"
                                >
                                    Next <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            {/* SOURCE COLUMN */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold theme-text-muted uppercase tracking-wider">Source ({defaultLang})</h4>
                                <div className="p-4 theme-surface border theme-border rounded-xl text-sm">
                                    {sourceData.question}
                                </div>
                                {sourceData.options.map((opt, i) => (
                                    <div key={i} className="p-3 theme-surface border theme-border rounded-xl text-sm opacity-80">
                                        {opt}
                                    </div>
                                ))}
                            </div>

                            {/* TARGET COLUMN — Editable */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-[var(--qb-primary)] uppercase tracking-wider">Target ({activeTab})</h4>
                                <textarea 
                                    className="w-full p-4 theme-surface border theme-border rounded-xl text-sm outline-none focus:border-[var(--qb-primary)] resize-none"
                                    rows={3}
                                    placeholder="Translate question..."
                                    value={targetData.text || ''}
                                    onChange={(e) => updateTranslationField('text', e.target.value)}
                                />
                                {sourceData.options.map((_, i) => (
                                    <input 
                                        key={i}
                                        className="w-full p-3 theme-surface border theme-border rounded-xl text-sm outline-none focus:border-[var(--qb-primary)]"
                                        placeholder={`Option ${i + 1}`}
                                        value={targetData.options?.[i] || ''}
                                        onChange={(e) => updateTranslationField(`option_${i}`, e.target.value)}
                                    />
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="p-6 border-t theme-border flex justify-end gap-3 shrink-0">
                <button 
                    onClick={onClose}
                    className="h-10 px-4 rounded-xl text-sm font-medium border theme-border hover:theme-surface flex items-center gap-2"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="h-10 px-6 rounded-xl text-sm font-medium bg-[var(--qb-primary)] text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                    <Check size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
};

export default TranslationDrawer;
