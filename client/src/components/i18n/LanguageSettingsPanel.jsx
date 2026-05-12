import React, { useState, useRef, useCallback } from 'react';
import { Globe, Languages, Wand2, Upload, FileJson, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../../utils/supportedLanguages';
import { typography, cx } from '../../styles/index';
import apiClient from '../../services/apiClient';
import TranslationDrawer from './TranslationDrawer';

const LanguageSettingsPanel = ({ quiz, updateQuiz, isSaving }) => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [aiStatus, setAiStatus] = useState('idle'); // idle | loading | success | error
    const [aiMessage, setAiMessage] = useState('');
    const [importStatus, setImportStatus] = useState('idle');
    const [importMessage, setImportMessage] = useState('');
    const fileInputRef = useRef(null);

    // Fallbacks
    const defaultLang = quiz.defaultLanguage || 'en';
    const availableLangs = quiz.availableLanguages || ['en'];
    const requireSelection = quiz.requireLanguageSelection !== false;
    const targetLangs = availableLangs.filter(l => l !== defaultLang);

    const handleToggleLang = (code) => {
        if (code === defaultLang) return;
        const newLangs = availableLangs.includes(code)
            ? availableLangs.filter(l => l !== code)
            : [...availableLangs, code];
        updateQuiz({ availableLanguages: newLangs });
    };

    const handleDefaultLangChange = (code) => {
        const newLangs = availableLangs.includes(code) ? availableLangs : [...availableLangs, code];
        updateQuiz({ defaultLanguage: code, availableLanguages: newLangs });
    };

    // ── AI Translate ────────────────────────────────────────────────────────

    const translateAll = async () => {
        if (!targetLangs.length) {
            setAiStatus('error');
            setAiMessage('Enable at least one extra language first.');
            return;
        }

        setAiStatus('loading');
        setAiMessage('Translating with AI...');

        try {
            const res = await apiClient.post(`/quiz/${quiz._id}/translate`, {
                slideIds: ['all'],
                targetLanguages: targetLangs,
                sourceLanguage: defaultLang,
            });

            if (res.data?.success) {
                setAiStatus('success');
                setAiMessage(res.data.message || 'Translation completed!');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                setAiStatus('error');
                setAiMessage(res.data?.message || 'Translation failed.');
            }
        } catch (e) {
            setAiStatus('error');
            const serverMsg = e?.response?.data?.message || e.message || 'Translation service unavailable.';
            setAiMessage(serverMsg);
        }
    };

    // ── JSON Import ─────────────────────────────────────────────────────────

    const downloadTemplate = useCallback(() => {
        const template = {
            _instructions: 'Fill in the translations for each question below. Keep the structure intact. Save as .json and upload.',
            _format: 'translationsByIndex',
            translationsByIndex: (quiz.questions || []).map((q, i) => {
                const entry = {};
                for (const lang of targetLangs) {
                    const existing = q.translations?.[lang] || q.translations?.get?.(lang);
                    entry[lang] = {
                        text: existing?.text || '',
                        options: (q.options || []).map((_, optIdx) => existing?.options?.[optIdx] || ''),
                    };
                }
                return {
                    _questionIndex: i,
                    _sourceText: q.text,
                    _sourceOptions: q.options,
                    ...entry,
                };
            }),
        };

        const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${quiz.title || 'quiz'}_translations_template.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [quiz, targetLangs]);

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportStatus('loading');
        setImportMessage('Reading file...');

        try {
            const text = await file.text();
            const parsed = JSON.parse(text);

            // Support both formats
            const body = {};
            if (parsed.translationsByIndex) {
                // Strip helper fields before sending
                body.translationsByIndex = parsed.translationsByIndex.map(entry => {
                    const cleaned = { ...entry };
                    delete cleaned._questionIndex;
                    delete cleaned._sourceText;
                    delete cleaned._sourceOptions;
                    return cleaned;
                });
            } else if (parsed.translations) {
                body.translations = parsed.translations;
            } else {
                throw new Error('Invalid format. JSON must contain "translationsByIndex" (array) or "translations" (object keyed by question ID).');
            }

            const res = await apiClient.post(`/quiz/${quiz._id}/translations/import`, body);

            if (res.data?.success) {
                setImportStatus('success');
                setImportMessage(res.data.message || `Imported ${res.data.data?.applied || 0} translation(s)`);
                setTimeout(() => window.location.reload(), 1500);
            } else {
                setImportStatus('error');
                setImportMessage(res.data?.message || 'Import failed.');
            }
        } catch (err) {
            setImportStatus('error');
            setImportMessage(err?.response?.data?.message || err.message || 'Failed to import translations.');
        } finally {
            // Reset file input so same file can be re-uploaded
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="pt-6 mt-6 border-t theme-border space-y-5">
            <div>
                <h3 className={cx(typography.metaLabel, 'mb-3 flex items-center gap-2')}>
                    <Globe size={14} /> Language Settings
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
                                    <span>{lang.flag} {lang.native}</span>
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
                        <span>Require language selection before join</span>
                    </label>
                </div>
            </div>

            {/* ── Translate Section ─────────────────────────────────────────── */}
            <div className="pt-4 border-t theme-border">
                <h3 className={cx(typography.metaLabel, 'mb-3 flex items-center gap-2')}>
                    <Languages size={14} /> Translate Questions
                </h3>

                <div className="space-y-2">
                    {/* AI Translate */}
                    <button
                        onClick={translateAll}
                        disabled={isSaving || aiStatus === 'loading' || targetLangs.length === 0}
                        className="w-full h-10 rounded-xl bg-[var(--qb-primary)]/10 text-[var(--qb-primary)] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[var(--qb-primary)]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Wand2 size={16} />
                        {aiStatus === 'loading' ? 'Translating...' : 'AI Translate All ✦'}
                    </button>

                    {/* Manual Edit */}
                    <button
                        onClick={() => setIsDrawerOpen(true)}
                        disabled={targetLangs.length === 0}
                        className="w-full h-10 rounded-xl border theme-border text-sm font-medium flex items-center justify-center gap-2 hover:theme-surface transition-colors disabled:opacity-50"
                    >
                        Manual Edit Translations
                    </button>

                    {/* JSON Upload */}
                    <div className="flex gap-2">
                        <button
                            onClick={downloadTemplate}
                            disabled={targetLangs.length === 0}
                            className="flex-1 h-10 rounded-xl border theme-border text-sm font-medium flex items-center justify-center gap-2 hover:theme-surface transition-colors disabled:opacity-50"
                        >
                            <FileJson size={14} /> Download Template
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importStatus === 'loading' || targetLangs.length === 0}
                            className="flex-1 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                        >
                            <Upload size={14} /> {importStatus === 'loading' ? 'Importing...' : 'Upload JSON'}
                        </button>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                </div>

                {/* Status Messages */}
                {aiStatus === 'error' && (
                    <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <span>{aiMessage}</span>
                    </div>
                )}
                {aiStatus === 'success' && (
                    <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={16} className="shrink-0" />
                        <span>{aiMessage}</span>
                    </div>
                )}
                {importStatus === 'error' && (
                    <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <span>{importMessage}</span>
                    </div>
                )}
                {importStatus === 'success' && (
                    <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={16} className="shrink-0" />
                        <span>{importMessage}</span>
                    </div>
                )}
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
