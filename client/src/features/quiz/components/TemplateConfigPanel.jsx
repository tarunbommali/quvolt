/**
 * TemplateConfigPanel.jsx
 *
 * Pre-session template configuration panel.
 * Shown before starting a quiz to let the host configure:
 *   - Timer, Scoring, Leaderboard, Flow, Access, Advanced
 *
 * Plan-gated features are shown but locked with an upgrade prompt.
 */
import { useEffect, useState, useCallback } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
    Timer, Star, Trophy, Shuffle, Users, Shield,
    ChevronDown, ChevronUp, Save, Check, Lock, Zap,
    X, Plus, RotateCcw
} from 'lucide-react';
import { useTemplateStore } from '../../../stores/useTemplateStore';
import { useAuthStore } from '../../../stores/useAuthStore';

// ── Helpers ──────────────────────────────────────────────────────────────────

const userPlan = (user) => (user?.subscription?.plan || 'FREE').toUpperCase();

const isCreatorOrAbove = (plan) => ['CREATOR', 'TEAMS'].includes(plan);
const isTeams = (plan) => plan === 'TEAMS';

// ── Sub-components ────────────────────────────────────────────────────────────

const SectionHeader = ({ icon: Icon, title, isOpen, onToggle }) => (
    <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl theme-surface-soft theme-interactive hover:theme-surface transition-colors"
    >
        <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-[color-mix(in_srgb,var(--qb-primary)_12%,var(--qb-surface-1))]">
                <Icon size={14} className="text-(--qb-primary)" />
            </span>
            <span className="text-sm font-bold theme-text-primary">{title}</span>
        </div>
        {isOpen ? <ChevronUp size={14} className="theme-text-muted" /> : <ChevronDown size={14} className="theme-text-muted" />}
    </button>
);

const Toggle = ({ checked, onChange, disabled, planLock }) => (
    <div className="flex items-center gap-2">
        {planLock && <Lock size={11} className="text-amber-400" />}
        <button
            type="button"
            onClick={() => !disabled && !planLock && onChange(!checked)}
            disabled={disabled || planLock}
            className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none
                ${checked && !planLock ? 'bg-(--qb-primary)' : 'bg-gray-300 dark:bg-gray-600'}
                ${(disabled || planLock) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked && !planLock ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    </div>
);

const NumberInput = ({ value, onChange, min, max, step = 1, disabled }) => (
    <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 text-sm font-bold text-center px-2 py-1 rounded-lg border theme-border theme-surface theme-text-primary focus:outline-none focus:border-(--qb-primary) disabled:opacity-50"
    />
);

const Row = ({ label, hint, children }) => (
    <div className="flex items-center justify-between gap-4 py-2 border-b theme-border last:border-0">
        <div className="min-w-0">
            <p className="text-xs font-semibold theme-text-primary">{label}</p>
            {hint && <p className="text-[10px] theme-text-muted mt-0.5">{hint}</p>}
        </div>
        <div className="shrink-0">{children}</div>
    </div>
);

const PlanBadge = ({ plan }) => {
    const colors = {
        FREE: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
        CREATOR: 'bg-amber-50 text-amber-600 border border-amber-200',
        TEAMS: 'bg-indigo-50 text-indigo-600 border border-indigo-200',
    };
    return (
        <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full ${colors[plan] || colors.FREE}`}>
            {plan}
        </span>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────

const TemplateConfigPanel = ({ onClose, onStart, quizTitle, globalDefaultsMode }) => {
    const user = useAuthStore(s => s.user);
    const plan = userPlan(user);
    const creator = isCreatorOrAbove(plan);
    const teams = isTeams(plan);

    const {
        templates, activeTemplate, loading, saving, error,
        fetchTemplates, selectTemplate, updateTemplate, createTemplate, setDefault,
    } = useTemplateStore();

    // Local draft — edit without touching the store until Save
    const [draft, setDraft] = useState(null);
    const [open, setOpen] = useState({ timer: true, scoring: true, leaderboard: false, flow: false, access: false, advanced: false });
    const [saved, setSaved] = useState(false);
    const [tab, setTab] = useState('configure'); // 'configure' | 'templates'

    useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

    useEffect(() => {
        if (activeTemplate && !draft) {
            setDraft(JSON.parse(JSON.stringify(activeTemplate)));
        }
    }, [activeTemplate, draft]);

    const toggle = (section) => setOpen(o => ({ ...o, [section]: !o[section] }));

    const setVal = useCallback((path, value) => {
        setDraft(prev => {
            const next = { ...prev };
            const parts = path.split('.');
            let cur = next;
            for (let i = 0; i < parts.length - 1; i++) {
                cur[parts[i]] = { ...cur[parts[i]] };
                cur = cur[parts[i]];
            }
            cur[parts[parts.length - 1]] = value;
            return next;
        });
    }, []);

    const handleSave = async () => {
        if (!draft?._id) return;
        await updateTemplate(draft._id, draft);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleSaveAndStart = async () => {
        await handleSave();
        onStart?.(draft);
    };

    const handleReset = () => {
        if (activeTemplate) setDraft(JSON.parse(JSON.stringify(activeTemplate)));
    };

    if (loading || !draft) {
        return (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
                <div className="rounded-2xl theme-surface p-8 flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-(--qb-primary) border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm theme-text-muted">Loading template…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <Motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl theme-surface border theme-border shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b theme-border shrink-0">
                    <div>
                        <h2 className="text-base font-black theme-text-primary">
                            {globalDefaultsMode ? 'Defaults Settings' : 'Session Configuration'}
                        </h2>
                        <p className="text-xs theme-text-muted mt-0.5">
                            {globalDefaultsMode
                                ? 'These defaults apply to every new template you create'
                                : quizTitle
                                    ? `Settings for: ${quizTitle}`
                                    : 'Configure the quiz engine before starting'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <PlanBadge plan={plan} />
                        <button onClick={onClose} className="p-1.5 rounded-lg theme-interactive theme-text-muted hover:theme-text-primary transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-5 pt-3 pb-0 shrink-0">
                    {['configure', 'templates'].map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors capitalize
                                ${tab === t ? 'bg-(--qb-primary) text-white' : 'theme-surface-soft theme-text-muted hover:theme-text-primary'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                    {tab === 'configure' ? (
                        <>
                            {/* Active template name */}
                            <div className="flex items-center gap-2 pb-2">
                                <div className="flex-1 px-3 py-2 rounded-xl border theme-border theme-surface-soft">
                                    <p className="text-[10px] font-bold uppercase tracking-wide theme-text-muted">Active Template</p>
                                    <p className="text-sm font-black theme-text-primary">{draft.name}</p>
                                </div>
                                {draft.isDefault && (
                                    <span className="px-2 py-1 bg-[color-mix(in_srgb,var(--qb-primary)_12%,var(--qb-surface-1))] text-(--qb-primary) text-[10px] font-black uppercase tracking-wide rounded-lg">
                                        Default
                                    </span>
                                )}
                            </div>

                            {/* ── Timer ── */}
                            <div className="space-y-1">
                                <SectionHeader icon={Timer} title="Timer" isOpen={open.timer} onToggle={() => toggle('timer')} />
                                <AnimatePresence initial={false}>
                                    {open.timer && (
                                        <Motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-4 py-2 rounded-xl theme-surface-soft space-y-1">
                                            <Row label="Time per question" hint="Seconds each question is shown">
                                                <NumberInput value={draft.timer?.questionTime ?? 15} onChange={v => setVal('timer.questionTime', v)} min={5} max={300} />
                                            </Row>
                                            <Row label="Auto advance" hint="Move to next question when timer expires">
                                                <Toggle checked={draft.timer?.autoNext ?? true} onChange={v => setVal('timer.autoNext', v)} />
                                            </Row>
                                            <Row label="Gap between questions" hint="Seconds of delay between questions">
                                                <NumberInput value={draft.timer?.interQuestionDelay ?? 3} onChange={v => setVal('timer.interQuestionDelay', v)} min={0} max={30} />
                                            </Row>
                                        </Motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* ── Scoring ── */}
                            <div className="space-y-1">
                                <SectionHeader icon={Star} title="Scoring" isOpen={open.scoring} onToggle={() => toggle('scoring')} />
                                <AnimatePresence initial={false}>
                                    {open.scoring && (
                                        <Motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-4 py-2 rounded-xl theme-surface-soft space-y-1">
                                            <Row label="Base points per correct answer">
                                                <NumberInput value={draft.scoring?.basePoints ?? 100} onChange={v => setVal('scoring.basePoints', v)} min={0} max={1000} step={10} />
                                            </Row>
                                            <Row label="Speed bonus" hint="Extra points for answering quickly">
                                                <Toggle checked={draft.scoring?.speedBonus ?? true} onChange={v => setVal('scoring.speedBonus', v)} />
                                            </Row>
                                            {draft.scoring?.speedBonus && (
                                                <Row label="Max speed bonus points">
                                                    <NumberInput value={draft.scoring?.speedBonusMax ?? 50} onChange={v => setVal('scoring.speedBonusMax', v)} min={0} max={500} step={10} />
                                                </Row>
                                            )}
                                            <Row label="Negative marking" hint={creator ? 'Deduct points for wrong answers' : 'Creator plan required'}>
                                                <Toggle
                                                    checked={draft.scoring?.negativeMarking?.enabled ?? false}
                                                    onChange={v => setVal('scoring.negativeMarking.enabled', v)}
                                                    planLock={!creator}
                                                />
                                            </Row>
                                            {draft.scoring?.negativeMarking?.enabled && creator && (
                                                <Row label="Penalty per wrong answer">
                                                    <NumberInput value={draft.scoring?.negativeMarking?.penalty ?? 25} onChange={v => setVal('scoring.negativeMarking.penalty', v)} min={0} max={500} step={5} />
                                                </Row>
                                            )}
                                        </Motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* ── Leaderboard ── */}
                            <div className="space-y-1">
                                <SectionHeader icon={Trophy} title="Leaderboard" isOpen={open.leaderboard} onToggle={() => toggle('leaderboard')} />
                                <AnimatePresence initial={false}>
                                    {open.leaderboard && (
                                        <Motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-4 py-2 rounded-xl theme-surface-soft space-y-1">
                                            <Row label="Enable leaderboard"><Toggle checked={draft.leaderboard?.enabled ?? true} onChange={v => setVal('leaderboard.enabled', v)} /></Row>
                                            <Row label="Show live in host console"><Toggle checked={draft.leaderboard?.showLive ?? true} onChange={v => setVal('leaderboard.showLive', v)} /></Row>
                                            <Row label="Show ranking after each question"><Toggle checked={draft.leaderboard?.showAfterEachQuestion ?? true} onChange={v => setVal('leaderboard.showAfterEachQuestion', v)} /></Row>
                                        </Motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* ── Question Flow ── */}
                            <div className="space-y-1">
                                <SectionHeader icon={Shuffle} title="Question Flow" isOpen={open.flow} onToggle={() => toggle('flow')} />
                                <AnimatePresence initial={false}>
                                    {open.flow && (
                                        <Motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-4 py-2 rounded-xl theme-surface-soft space-y-1">
                                            <Row label="Shuffle question order"><Toggle checked={draft.flow?.shuffleQuestions ?? false} onChange={v => setVal('flow.shuffleQuestions', v)} /></Row>
                                            <Row label="Shuffle answer options"><Toggle checked={draft.flow?.shuffleOptions ?? false} onChange={v => setVal('flow.shuffleOptions', v)} /></Row>
                                        </Motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* ── Access ── */}
                            <div className="space-y-1">
                                <SectionHeader icon={Users} title="Access" isOpen={open.access} onToggle={() => toggle('access')} />
                                <AnimatePresence initial={false}>
                                    {open.access && (
                                        <Motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-4 py-2 rounded-xl theme-surface-soft space-y-1">
                                            <Row label="Allow late join"><Toggle checked={draft.access?.allowLateJoin ?? true} onChange={v => setVal('access.allowLateJoin', v)} /></Row>
                                            <Row label="Max participants">
                                                <NumberInput value={draft.access?.maxParticipants ?? 200} onChange={v => setVal('access.maxParticipants', v)} min={1} max={100000} step={10} />
                                            </Row>
                                        </Motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* ── Advanced ── */}
                            <div className="space-y-1">
                                <SectionHeader icon={Shield} title="Advanced" isOpen={open.advanced} onToggle={() => toggle('advanced')} />
                                <AnimatePresence initial={false}>
                                    {open.advanced && (
                                        <Motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-4 py-2 rounded-xl theme-surface-soft space-y-1">
                                            <Row label="Anti-cheat detection" hint={creator ? 'Flag suspicious answer patterns' : 'Creator plan required'}>
                                                <Toggle checked={draft.advanced?.antiCheat ?? false} onChange={v => setVal('advanced.antiCheat', v)} planLock={!creator} />
                                            </Row>
                                            <Row label="Tab switch detection" hint={creator ? 'Alert when participant leaves tab' : 'Creator plan required'}>
                                                <Toggle checked={draft.advanced?.tabSwitchDetection ?? false} onChange={v => setVal('advanced.tabSwitchDetection', v)} planLock={!creator} />
                                            </Row>
                                            <Row label="Require camera" hint={teams ? 'Webcam proctoring' : 'Teams plan required'}>
                                                <Toggle checked={draft.advanced?.requireCamera ?? false} onChange={v => setVal('advanced.requireCamera', v)} planLock={!teams} />
                                            </Row>
                                        </Motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </>
                    ) : (
                        /* ── Templates Tab ── */
                        <div className="space-y-2">
                            {templates.map(t => (
                                <div
                                    key={t._id}
                                    onClick={() => { selectTemplate(t); setDraft(JSON.parse(JSON.stringify(t))); setTab('configure'); }}
                                    className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all
                                        ${activeTemplate?._id === t._id
                                            ? 'border-(--qb-primary) bg-[color-mix(in_srgb,var(--qb-primary)_8%,var(--qb-surface-1))]'
                                            : 'theme-border theme-surface-soft hover:theme-surface'}`}
                                >
                                    <div>
                                        <p className="text-sm font-bold theme-text-primary">{t.name}</p>
                                        <p className="text-[10px] theme-text-muted mt-0.5">{t.description || 'No description'}</p>
                                        <div className="flex gap-2 mt-1">
                                            <span className="text-[9px] font-bold theme-text-muted">{t.timer?.questionTime}s/Q</span>
                                            <span className="text-[9px] font-bold theme-text-muted">{t.scoring?.basePoints}pts base</span>
                                            {t.scoring?.negativeMarking?.enabled && <span className="text-[9px] font-bold text-red-500">-{t.scoring.negativeMarking.penalty}pts</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {t.isDefault && <span className="text-[9px] font-black uppercase tracking-wide text-(--qb-primary)">Default</span>}
                                        {activeTemplate?._id === t._id && <Check size={14} className="text-(--qb-primary)" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-t theme-border shrink-0">
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold theme-text-muted theme-interactive rounded-lg transition-colors"
                    >
                        <RotateCcw size={13} /> Reset
                    </button>
                    <div className="flex items-center gap-2">
                        {error && <p className="text-xs text-red-500 font-medium max-w-[180px] truncate">{error}</p>}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold theme-surface-soft theme-text-primary rounded-lg border theme-border transition-colors hover:theme-surface disabled:opacity-60"
                        >
                            {saved ? <><Check size={13} className="text-green-500" /> Saved</> : <><Save size={13} /> Save</>}
                        </button>
                        {!globalDefaultsMode && (
                            <button
                                onClick={handleSaveAndStart}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-(--qb-primary) text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60"
                            >
                                <Zap size={13} fill="currentColor" /> Start Session
                            </button>
                        )}
                    </div>
                </div>
            </Motion.div>
        </div>
    );
};

export default TemplateConfigPanel;
