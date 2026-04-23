/**
 * TemplateConfigPage.jsx
 *
 * Full-page route for session template configuration.
 *
 * Routes:
 *   /studio/settings                → Global session defaults  (globalDefaultsMode)
 *   /quiz/templates/:id/settings    → Per-quiz session settings
 *
 * Fix: uses fetchDefault() which auto-creates a "Standard Quiz" template
 * for existing users who were registered before the template system existed.
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import {
    Timer, Star, Trophy, Shuffle, Users, Shield,
    ChevronDown, ChevronUp, Save, Check, Lock, Zap,
    RotateCcw, AlertCircle,
} from 'lucide-react';

import SubHeader from '../../../components/layout/SubHeader';
import LoadingScreen from '../../../components/common/LoadingScreen';

import { useAuthStore } from '../../../stores/useAuthStore';
import { useQuizStore } from '../../../stores/useQuizStore';
import * as templateApi from '../../../services/template.api';
import { updateQuiz } from '../../host/services/host.service';
import { buttonStyles } from '../../../styles/index';

// ── Plan helpers ───────────────────────────────────────────────────────────────
const getPlan     = (user) => (user?.subscription?.plan || 'FREE').toUpperCase();
const isCreator   = (plan) => ['CREATOR', 'TEAMS'].includes(plan);
const isTeamsOnly = (plan) => plan === 'TEAMS';

// ── Shared UI primitives (styled to match InviteRoom / SessionHistory) ─────────

const SectionHeader = ({ icon: Icon, title, isOpen, onToggle }) => (
    <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border theme-border theme-surface-soft hover:theme-surface transition-colors"
    >
        <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                <Icon size={14} className="text-indigo-600 dark:text-indigo-400" />
            </span>
            <span className="text-sm font-semibold theme-text-primary">{title}</span>
        </div>
        {isOpen
            ? <ChevronUp size={14} className="theme-text-muted" />
            : <ChevronDown size={14} className="theme-text-muted" />}
    </button>
);

const Toggle = ({ checked, onChange, planLock }) => (
    <div className="flex items-center gap-1.5">
        {planLock && <Lock size={11} className="text-amber-500" />}
        <button
            type="button"
            onClick={() => !planLock && onChange(!checked)}
            disabled={!!planLock}
            className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                ${checked && !planLock ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'}
                ${planLock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200
                ${checked && !planLock ? 'translate-x-4' : 'translate-x-0'}`}
            />
        </button>
    </div>
);

const NumberInput = ({ value, onChange, min, max, step = 1 }) => (
    <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 text-sm font-semibold text-center px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 theme-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors"
    />
);

const Row = ({ label, hint, children }) => (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-slate-100 dark:border-slate-700/60 last:border-0">
        <div className="min-w-0">
            <p className="text-sm font-medium theme-text-primary">{label}</p>
            {hint && <p className="text-xs theme-text-muted mt-0.5">{hint}</p>}
        </div>
        <div className="shrink-0">{children}</div>
    </div>
);

const PlanBadge = ({ plan }) => {
    const styles = {
        FREE:    'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
        CREATOR: 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400',
        TEAMS:   'bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400',
    };
    return (
        <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${styles[plan] || styles.FREE}`}>
            {plan}
        </span>
    );
};

// ── Config form ────────────────────────────────────────────────────────────────

const ConfigForm = ({ draft, setDraft, globalDefaultsMode, saving, error, onSave, onSaveAndStart, quizAccessType, onQuizAccessTypeChange }) => {
    const user    = useAuthStore((s) => s.user);
    const plan    = getPlan(user);
    const creator = isCreator(plan);
    const teams   = isTeamsOnly(plan);

    const [open, setOpen]   = useState({ timer: true, scoring: true, leaderboard: false, flow: false, access: false, advanced: false });
    const [saved, setSaved] = useState(false);

    const toggle = (section) => setOpen((o) => ({ ...o, [section]: !o[section] }));

    const setVal = useCallback((path, value) => {
        setDraft((prev) => {
            const next  = { ...prev };
            const parts = path.split('.');
            let cur = next;
            for (let i = 0; i < parts.length - 1; i++) {
                cur[parts[i]] = { ...(cur[parts[i]] || {}) };
                cur = cur[parts[i]];
            }
            cur[parts[parts.length - 1]] = value;
            return next;
        });
    }, [setDraft]);

    const handleSave = async () => {
        await onSave();
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const handleReset = () => setDraft(null); // parent will re-init from activeTemplate

    return (
        <div className="rounded-2xl border theme-border theme-surface shadow-sm overflow-hidden">

            {/* Card header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">Active Template</p>
                    <h3 className="text-base font-semibold theme-text-primary">{draft.name || 'Standard Quiz'}</h3>
                </div>
                <div className="flex items-center gap-2">
                    {draft.isDefault && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 rounded-full">
                            Default
                        </span>
                    )}
                    <PlanBadge plan={plan} />
                </div>
            </div>

            {/* Sections */}
            <div className="px-6 py-5 space-y-3">

                {/* ── Timer ── */}
                <SectionHeader icon={Timer} title="Timer" isOpen={open.timer} onToggle={() => toggle('timer')} />
                <AnimatePresence initial={false}>
                    {open.timer && (
                        <Motion.div
                            key="timer"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="px-4 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                                <Row label="Time per question" hint="Seconds each question is visible">
                                    <NumberInput value={draft.timer?.questionTime ?? 15} onChange={(v) => setVal('timer.questionTime', v)} min={5} max={300} />
                                </Row>
                                <Row label="Auto advance" hint="Automatically move to next question on expiry">
                                    <Toggle checked={draft.timer?.autoNext ?? true} onChange={(v) => setVal('timer.autoNext', v)} />
                                </Row>
                                <Row label="Gap between questions" hint="Delay in seconds before next question">
                                    <NumberInput value={draft.timer?.interQuestionDelay ?? 3} onChange={(v) => setVal('timer.interQuestionDelay', v)} min={0} max={30} />
                                </Row>
                            </div>
                        </Motion.div>
                    )}
                </AnimatePresence>

                {/* ── Scoring ── */}
                <SectionHeader icon={Star} title="Scoring" isOpen={open.scoring} onToggle={() => toggle('scoring')} />
                <AnimatePresence initial={false}>
                    {open.scoring && (
                        <Motion.div
                            key="scoring"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="px-4 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                                <Row label="Base points per correct answer">
                                    <NumberInput value={draft.scoring?.basePoints ?? 100} onChange={(v) => setVal('scoring.basePoints', v)} min={0} max={1000} step={10} />
                                </Row>
                                <Row label="Speed bonus" hint="Award extra points for fast correct answers">
                                    <Toggle checked={draft.scoring?.speedBonus ?? true} onChange={(v) => setVal('scoring.speedBonus', v)} />
                                </Row>
                                {draft.scoring?.speedBonus && (
                                    <Row label="Max speed bonus points">
                                        <NumberInput value={draft.scoring?.speedBonusMax ?? 50} onChange={(v) => setVal('scoring.speedBonusMax', v)} min={0} max={500} step={10} />
                                    </Row>
                                )}
                                <Row label="Negative marking" hint={creator ? 'Deduct points for wrong answers' : '🔒 Creator plan required'}>
                                    <Toggle checked={draft.scoring?.negativeMarking?.enabled ?? false} onChange={(v) => setVal('scoring.negativeMarking.enabled', v)} planLock={!creator} />
                                </Row>
                                {draft.scoring?.negativeMarking?.enabled && creator && (
                                    <Row label="Penalty per wrong answer">
                                        <NumberInput value={draft.scoring?.negativeMarking?.penalty ?? 25} onChange={(v) => setVal('scoring.negativeMarking.penalty', v)} min={0} max={500} step={5} />
                                    </Row>
                                )}
                            </div>
                        </Motion.div>
                    )}
                </AnimatePresence>

                {/* ── Leaderboard ── */}
                <SectionHeader icon={Trophy} title="Leaderboard" isOpen={open.leaderboard} onToggle={() => toggle('leaderboard')} />
                <AnimatePresence initial={false}>
                    {open.leaderboard && (
                        <Motion.div key="leaderboard" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-4 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                                <Row label="Enable leaderboard">
                                    <Toggle checked={draft.leaderboard?.enabled ?? true} onChange={(v) => setVal('leaderboard.enabled', v)} />
                                </Row>
                                <Row label="Show live in host console">
                                    <Toggle checked={draft.leaderboard?.showLive ?? true} onChange={(v) => setVal('leaderboard.showLive', v)} />
                                </Row>
                                <Row label="Show ranking after each question">
                                    <Toggle checked={draft.leaderboard?.showAfterEachQuestion ?? true} onChange={(v) => setVal('leaderboard.showAfterEachQuestion', v)} />
                                </Row>
                            </div>
                        </Motion.div>
                    )}
                </AnimatePresence>

                {/* ── Question Flow ── */}
                <SectionHeader icon={Shuffle} title="Question Flow" isOpen={open.flow} onToggle={() => toggle('flow')} />
                <AnimatePresence initial={false}>
                    {open.flow && (
                        <Motion.div key="flow" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-4 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                                <Row label="Shuffle question order">
                                    <Toggle checked={draft.flow?.shuffleQuestions ?? false} onChange={(v) => setVal('flow.shuffleQuestions', v)} />
                                </Row>
                                <Row label="Shuffle answer options">
                                    <Toggle checked={draft.flow?.shuffleOptions ?? false} onChange={(v) => setVal('flow.shuffleOptions', v)} />
                                </Row>
                            </div>
                        </Motion.div>
                    )}
                </AnimatePresence>

                {/* ── Access ── */}
                <SectionHeader icon={Users} title="Access" isOpen={open.access} onToggle={() => toggle('access')} />
                <AnimatePresence initial={false}>
                    {open.access && (
                        <Motion.div key="access" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-4 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                                {!globalDefaultsMode && (
                                    <Row label="Template Privacy" hint={quizAccessType === 'public' ? 'Public (Discoverable on the global marketplace)' : 'Private (Exclusive encrypted access via link)'}>
                                        <Toggle checked={quizAccessType === 'private'} onChange={(v) => onQuizAccessTypeChange(v ? 'private' : 'public')} planLock={!creator && quizAccessType === 'public'} />
                                    </Row>
                                )}
                                <Row label="Allow late join" hint="Participants can join after quiz starts">
                                    <Toggle checked={draft.access?.allowLateJoin ?? true} onChange={(v) => setVal('access.allowLateJoin', v)} />
                                </Row>
                                <Row label="Max participants">
                                    <NumberInput value={draft.access?.maxParticipants ?? 200} onChange={(v) => setVal('access.maxParticipants', v)} min={1} max={100000} step={10} />
                                </Row>
                            </div>
                        </Motion.div>
                    )}
                </AnimatePresence>

                {/* ── Advanced ── */}
                <SectionHeader icon={Shield} title="Advanced" isOpen={open.advanced} onToggle={() => toggle('advanced')} />
                <AnimatePresence initial={false}>
                    {open.advanced && (
                        <Motion.div key="advanced" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-4 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                                <Row label="Anti-cheat detection" hint={creator ? 'Flag suspicious answer patterns' : '🔒 Creator plan required'}>
                                    <Toggle checked={draft.advanced?.antiCheat ?? false} onChange={(v) => setVal('advanced.antiCheat', v)} planLock={!creator} />
                                </Row>
                                <Row label="Tab switch detection" hint={creator ? 'Alert when participant leaves tab' : '🔒 Creator plan required'}>
                                    <Toggle checked={draft.advanced?.tabSwitchDetection ?? false} onChange={(v) => setVal('advanced.tabSwitchDetection', v)} planLock={!creator} />
                                </Row>
                                <Row label="Require camera" hint={teams ? 'Webcam proctoring enabled' : '🔒 Teams plan required'}>
                                    <Toggle checked={draft.advanced?.requireCamera ?? false} onChange={(v) => setVal('advanced.requireCamera', v)} planLock={!teams} />
                                </Row>
                            </div>
                        </Motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
                <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                    <RotateCcw size={13} />
                    Reset
                </button>

                <div className="flex items-center gap-3">
                    {error && (
                        <p className="flex items-center gap-1.5 text-xs font-medium text-red-500 max-w-[200px] truncate">
                            <AlertCircle size={12} /> {error}
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className={`${buttonStyles.secondary} inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60`}
                    >
                        {saved
                            ? <><Check size={14} className="text-green-500" /> Saved</>
                            : <><Save size={14} /> Save</>}
                    </button>
                    {!globalDefaultsMode && (
                        <button
                            type="button"
                            onClick={onSaveAndStart}
                            disabled={saving}
                            className={`${buttonStyles.primary} inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60`}
                        >
                            <Zap size={14} fill="currentColor" />
                            Save &amp; Go to Lobby
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Page ───────────────────────────────────────────────────────────────────────

const TemplateConfigPage = () => {
    const navigate       = useNavigate();
    const { id }         = useParams();
    const [searchParams] = useSearchParams();

    const globalDefaultsMode = searchParams.get('mode') === 'global' || !id;

    const user               = useAuthStore((s) => s.user);
    const getQuizzesForParent = useQuizStore((s) => s.getQuizzesForParent);
    const activeQuiz         = useQuizStore((s) => s.activeQuiz);

    // Local state — we manage the template ourselves here, not via the store,
    // so we can use fetchDefault which auto-creates a template if none exists.
    const [template, setTemplate] = useState(null);
    const [draft, setDraft]       = useState(null);
    const [loading, setLoading]   = useState(true);
    const [saving, setSaving]     = useState(false);
    const [error, setError]       = useState(null);
    const [quizTitle, setQuizTitle] = useState('');
    const [quizAccessType, setQuizAccessType] = useState('public');

    // Resolve quiz title in per-quiz mode
    useEffect(() => {
        if (!id) return;
        if (activeQuiz && String(activeQuiz._id) === String(id)) {
            setQuizTitle(activeQuiz.title || '');
            setQuizAccessType(activeQuiz.accessType || 'public');
            return;
        }
        getQuizzesForParent('none')
            .then((quizzes) => {
                const match = quizzes?.find((q) => String(q._id) === String(id));
                if (match) {
                    setQuizTitle(match.title || '');
                    setQuizAccessType(match.accessType || 'public');
                }
            })
            .catch(() => {});
    }, [id, activeQuiz, getQuizzesForParent]);

    // Fetch the default template (auto-creates for existing users)
    useEffect(() => {
        let active = true;
        setLoading(true);
        setError(null);

        templateApi.fetchDefault()
            .then((tmpl) => {
                if (!active) return;
                setTemplate(tmpl);
                setDraft(JSON.parse(JSON.stringify(tmpl)));
            })
            .catch((err) => {
                if (!active) return;
                setError(err?.response?.data?.message || 'Failed to load template settings.');
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => { active = false; };
    }, []);

    // Re-init draft when reset (setDraft(null) from child)
    useEffect(() => {
        if (!draft && template) {
            setDraft(JSON.parse(JSON.stringify(template)));
        }
    }, [draft, template]);

    const handleSave = async () => {
        if (!draft?._id) return;
        setSaving(true);
        setError(null);
        try {
            const updated = await templateApi.updateTemplate(draft._id, draft);
            setTemplate(updated);
            setDraft(JSON.parse(JSON.stringify(updated)));
            
            // Save Template Privacy if applicable
            if (!globalDefaultsMode && id && quizAccessType) {
                try {
                    await updateQuiz(id, { accessType: quizAccessType });
                    if (activeQuiz && activeQuiz._id === id) {
                        useQuizStore.getState().setActiveQuiz({ ...activeQuiz, accessType: quizAccessType });
                    }
                    const quizzes = useQuizStore.getState().quizzes || [];
                    const updatedQuizzes = quizzes.map(q => String(q._id) === String(id) ? { ...q, accessType: quizAccessType } : q);
                    useQuizStore.setState({ quizzes: updatedQuizzes });
                } catch (accessErr) {
                    console.error("Failed to update template privacy", accessErr);
                }
            }
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAndStart = async () => {
        await handleSave();
        if (id) {
            navigate(`/quiz/templates/${id}/session`);
        } else {
            navigate('/studio');
        }
    };

    // Breadcrumbs
    const breadcrumbs = globalDefaultsMode
        ? [{ label: 'Studio', href: '/studio' }, { label: 'Global Session Defaults' }]
        : [
            { label: 'Studio', href: '/studio' },
            ...(quizTitle ? [{ label: quizTitle, href: `/quiz/templates/${id}` }] : []),
            { label: 'Session Settings' },
        ];

    const pageTitle    = globalDefaultsMode ? 'Global Session Defaults' : 'Session Settings';
    const pageSubtitle = globalDefaultsMode
        ? 'Default configuration applied to every new session'
        : quizTitle ? `Configuring session engine for "${quizTitle}"` : 'Configure the quiz engine before launching';

    if (loading) return <LoadingScreen />;

    return (
        <div className="app-page space-y-6 animate-in fade-in duration-300">
            <SubHeader
                title={pageTitle}
                subtitle={pageSubtitle}
                breadcrumbs={breadcrumbs}
                actions={
                    !globalDefaultsMode && (
                        <button
                            type="button"
                            onClick={handleSaveAndStart}
                            disabled={saving || !draft}
                            className={`${buttonStyles.primary} inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60`}
                        >
                            <Zap size={15} fill="currentColor" />
                            Save &amp; Go to Lobby
                        </button>
                    )
                }
            />

            {error && !draft && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3">
                    <AlertCircle size={16} className="text-red-500 shrink-0" />
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
                    <button
                        type="button"
                        onClick={() => { setLoading(true); templateApi.fetchDefault().then(t => { setTemplate(t); setDraft(JSON.parse(JSON.stringify(t))); }).catch(e => setError(e.message)).finally(() => setLoading(false)); }}
                        className="ml-auto text-xs font-semibold text-red-600 hover:underline"
                    >
                        Retry
                    </button>
                </div>
            )}

            {draft && (
                <ConfigForm
                    draft={draft}
                    setDraft={setDraft}
                    globalDefaultsMode={globalDefaultsMode}
                    saving={saving}
                    error={error}
                    onSave={handleSave}
                    onSaveAndStart={handleSaveAndStart}
                    quizAccessType={quizAccessType}
                    onQuizAccessTypeChange={setQuizAccessType}
                />
            )}
        </div>
    );
};

export default TemplateConfigPage;
