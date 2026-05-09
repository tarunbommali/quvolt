import React, { useState } from 'react';
import { X, Wand2, Check } from 'lucide-react';
import { typography, cx } from '../../styles/index';
import { SUPPORTED_LANGUAGES } from '../../utils/supportedLanguages';

const TranslationDrawer = ({ quiz, updateQuiz, onClose }) => {
    // Only show tabs for enabled languages (excluding default)
    const defaultLang = quiz.defaultLanguage || 'en';
    const targetLangs = (quiz.availableLanguages || []).filter(l => l !== defaultLang);
    
    const [activeTab, setActiveTab] = useState(targetLangs[0] || null);
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);

    const slide = quiz.questions?.[activeSlideIndex];
    if (!slide) return null;

    const sourceData = {
        question: slide.text || slide.question || '',
        options: slide.options || []
    };

    const targetData = (slide.translations && slide.translations[activeTab]) || {
        text: '',
        options: slide.options.map(() => '')
    };

    const handleSave = () => {
        // [I18N] Commits the manual translation changes
        // Since we don't have deep partial update easy, we'll just alert for now or update full quiz
        alert('Translation saved locally (simulate updateQuiz)');
        // In reality, we'd clone quiz.questions, update the slide's translations, and call updateQuiz
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
                            <h3 className={typography.h4}>Slide {activeSlideIndex + 1} of {quiz.questions.length}</h3>
                            <div className="flex gap-2">
                                <button 
                                    disabled={activeSlideIndex === 0}
                                    onClick={() => setActiveSlideIndex(i => i - 1)}
                                    className="px-3 py-1 text-sm border theme-border rounded hover:theme-surface disabled:opacity-50"
                                >
                                    Prev
                                </button>
                                <button 
                                    disabled={activeSlideIndex === quiz.questions.length - 1}
                                    onClick={() => setActiveSlideIndex(i => i + 1)}
                                    className="px-3 py-1 text-sm border theme-border rounded hover:theme-surface disabled:opacity-50"
                                >
                                    Next
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

                            {/* TARGET COLUMN */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-[var(--qb-primary)] uppercase tracking-wider">Target ({activeTab})</h4>
                                <textarea 
                                    className="w-full p-4 theme-surface border theme-border rounded-xl text-sm outline-none focus:border-[var(--qb-primary)] resize-none"
                                    rows={3}
                                    placeholder="Translate question..."
                                    value={targetData.text || targetData.question || ''}
                                    readOnly
                                />
                                {targetData.options.map((opt, i) => (
                                    <input 
                                        key={i}
                                        className="w-full p-3 theme-surface border theme-border rounded-xl text-sm outline-none focus:border-[var(--qb-primary)]"
                                        placeholder={`Option ${i + 1}`}
                                        value={opt}
                                        readOnly
                                    />
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="p-6 border-t theme-border flex justify-end gap-3 shrink-0">
                <button className="h-10 px-4 rounded-xl text-sm font-medium border theme-border hover:theme-surface flex items-center gap-2">
                    <Wand2 size={16} /> Apply AI Translation
                </button>
                <button onClick={handleSave} className="h-10 px-6 rounded-xl text-sm font-medium bg-[var(--qb-primary)] text-white hover:opacity-90 flex items-center gap-2">
                    <Check size={16} /> Save Changes
                </button>
            </div>
        </div>
    );
};

export default TranslationDrawer;
