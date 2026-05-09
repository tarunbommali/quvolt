import { Layout, Layers, Globe, Lock, ShieldCheck, Zap, User, ChevronRight } from 'lucide-react';
import Modal, { ModalShell, ModalHeader, ModalBody, ModalFooter, ModalButton } from '../../../components/common/ui/Modal';
import { typography, forms, cx } from '../../../styles/index';

/**
 * CreateQuizModal
 *
 * Floating modal for initializing a new quiz or collection.
 * All layout/spacing tokens are inherited from ModalShell hierarchy.
 * Zero function changes — only the wrapping markup is refactored.
 *
 * Props:
 *   open                    {boolean}
 *   onClose                 {() => void}
 *   accessType              {string}
 *   onAccessTypeChange      {(v: string) => void}
 *   newQuizTitle            {string}
 *   onTitleChange           {(v: string) => void}
 *   onCreate                {() => void}
 *   subscriptionEntitlements {object}
 *   quizType                {string}
 *   onQuizTypeChange        {(v: string) => void}
 *   quizMode                {string}
 *   onQuizModeChange        {(v: string) => void}
 */
const CreateQuizModal = ({
    open,
    onClose,
    accessType,
    onAccessTypeChange,
    newQuizTitle,
    onTitleChange,
    onCreate,
    subscriptionEntitlements,
    quizType = 'template',
    onQuizTypeChange,
    quizMode = 'auto',
    onQuizModeChange,
}) => {
    const handleCreate = () => {
        onCreate();
        onClose();
    };

    return (
        <Modal open={open} onClose={onClose}>
            <ModalShell>
                <ModalHeader
                    title="Create New Content"
                    subtitle="Configure your session logic and deployment parameters."
                    onClose={onClose}
                    closeLabel="Close create quiz dialog"
                />

                <ModalBody>
                    {/* ── Quiz Title ─────────────────────────────────────── */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className={typography.eyebrow}>Quiz Title</label>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500/60">
                                Required
                            </span>
                        </div>
                        <div className="relative group">
                            <input
                                id="create-quiz-title-input"
                                type="text"
                                autoFocus
                                placeholder={
                                    quizType === 'quiz'
                                        ? 'e.g. Q4 Enterprise Compliance Assessment'
                                        : 'e.g. Engineering Onboarding Templates'
                                }
                                value={newQuizTitle}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    onTitleChange(val.charAt(0).toUpperCase() + val.slice(1));
                                }}
                                className={cx(
                                    forms.inputField,
                                    'pr-10 border-2 hover:border-indigo-500/30 transition-colors',
                                )}
                            />
                            <ChevronRight
                                size={18}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 opacity-0 group-focus-within:opacity-100 transition-opacity"
                            />
                        </div>
                        <p className="text-[12px] text-indigo-500/70">
                            Visible to all participants during session synchronization.
                        </p>
                    </div>

                    {/* ── Option Groups (3 × 2) ──────────────────────────── */}
                    <div className="grid grid-cols-3 gap-3">
                        {/* Content Type */}
                        <OptionGroup label="Content Type">
                            <OptionCard
                                icon={Layout}
                                label="Single Quiz"
                                sub="Individual Quiz"
                                active={quizType === 'template'}
                                onClick={() => onQuizTypeChange?.('template')}
                            />
                            <OptionCard
                                icon={Layers}
                                label="Collection"
                                sub="Grouped Content"
                                active={quizType === 'subject'}
                                onClick={() => onQuizTypeChange?.('subject')}
                            />
                        </OptionGroup>

                        {/* Session Engine */}
                        <OptionGroup label="Session Engine">
                            <OptionCard
                                icon={Zap}
                                label="Auto-Sync"
                                sub="Automated Logic"
                                active={quizMode === 'auto'}
                                onClick={() => onQuizModeChange?.('auto')}
                            />
                            <OptionCard
                                icon={User}
                                label="Tutor-Led"
                                sub="Host Control"
                                active={quizMode === 'tutor'}
                                onClick={() => onQuizModeChange?.('tutor')}
                            />
                        </OptionGroup>

                        {/* Privacy */}
                        <OptionGroup label="Privacy">
                            <OptionCard
                                icon={Globe}
                                label="Public Node"
                                sub="Global Discovery"
                                active={accessType === 'public'}
                                onClick={() => onAccessTypeChange('public')}
                            />
                            <OptionCard
                                icon={Lock}
                                label="Private Node"
                                sub="Encrypted Link"
                                active={accessType === 'private'}
                                disabled={!subscriptionEntitlements.canUsePrivateHosting}
                                onClick={() => onAccessTypeChange('private')}
                            />
                        </OptionGroup>
                    </div>

                    {/* ── Mode hint ──────────────────────────────────────── */}
                    <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 px-3 py-2.5">
                        <ShieldCheck size={15} className="shrink-0 text-emerald-500" />
                        <p className="text-[12px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
                            {quizMode === 'tutor'
                                ? 'Tutor mode grants you full manual control over question sequence.'
                                : 'Auto mode enables automated question advancement and real-time synchronization.'}
                        </p>
                    </div>
                </ModalBody>

                <ModalFooter>
                    <ModalButton variant="ghost" onClick={onClose}>
                        Cancel
                    </ModalButton>
                    <ModalButton
                        id="create-quiz-submit-btn"
                        variant="primary"
                        onClick={handleCreate}
                    >
                        <Zap size={14} fill="currentColor" />
                        Initialize Content
                    </ModalButton>
                </ModalFooter>
            </ModalShell>
        </Modal>
    );
};

// ── Internal sub-components ─────────────────────────────────────────────────

const OptionGroup = ({ label, children }) => (
    <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-0.5">{label}</p>
        <div className="space-y-2">{children}</div>
    </div>
);

const OptionCard = ({ icon: Icon, label, sub, active, disabled, onClick }) => (
    <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={cx(
            'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all duration-150 text-left',
            active
                ? 'border-indigo-500 bg-indigo-500/5'
                : 'border-transparent bg-gray-100/60 dark:bg-white/5 hover:border-indigo-400/30',
            disabled ? 'opacity-40 grayscale cursor-not-allowed' : '',
        )}
    >
        <div className={cx(
            'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
            active ? 'bg-indigo-500 text-white' : 'bg-white dark:bg-white/10 text-slate-400',
        )}>
            <Icon size={13} />
        </div>
        <div className="min-w-0">
            <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 leading-tight truncate">{label}</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 mt-0.5">{sub}</p>
        </div>
    </button>
);

export default CreateQuizModal;
