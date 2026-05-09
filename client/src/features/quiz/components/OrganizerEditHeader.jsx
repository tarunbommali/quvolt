import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, EllipsisVertical, Play, Save, Sparkles, FileJson, BarChart3, MonitorCog, Undo2, Redo2, CloudOff, AlertCircle, CheckCircle2, RotateCw } from 'lucide-react';

import { textStyles as textTokens } from '../../../styles/commonStyles';
import { buttonStyles, components, cx } from '../../../styles/index';

/**
 * Editor header with navigation and primary actions.
 * @param {{ title: string, isSaving: boolean, saveStatus: string, onBack: () => void, onOpenImport: () => void, onOpenAI: () => void, onOpenResults: () => void, onSave: () => void, onLaunch: () => void, onOpenCommandPalette?: () => void, onUndo: () => void, onRedo: () => void, canUndo: boolean, canRedo: boolean }} props
 */
const OrganizerEditHeader = ({
    title,
    isSaving,
    saveStatus,
    onBack,
    onOpenImport,
    onOpenAI,
    onOpenResults,
    onSave,
    onLaunch,
    onOpenCommandPalette,
    onUndo,
    onRedo,
    canUndo,
    canRedo
}) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        if (!mobileMenuOpen) return undefined;

        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMobileMenuOpen(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') setMobileMenuOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [mobileMenuOpen]);

    const renderSaveStatus = () => {
        switch (saveStatus) {
            case 'saving':
                return <><RotateCw size={14} className="animate-spin" /> SAVING</>;
            case 'offline':
                return <><CloudOff size={14} /> OFFLINE</>;
            case 'error':
                return <><AlertCircle size={14} /> ERROR</>;
            case 'saved':
                return <><CheckCircle2 size={14} /> SAVED</>;
            case 'dirty':
                return <><Save size={14} /> SAVE</>;
            default:
                return <><Save size={14} /> SAVE</>;
        }
    };

    return (
        <header className={components.host.header}>
            <div className={components.host.headerLeft}>
                <button type="button" onClick={onBack} className={cx(buttonStyles.icon, components.host.navBack)}>
                    <ChevronLeft size={20} />
                </button>
                <div className="min-w-0">
                    <p className={components.host.headerEyebrow}>Quiz editor</p>
                    <h1 className={cx(textTokens.title, components.host.titleClamp)}>{title}</h1>
                </div>

                <div className="ml-4 flex items-center gap-1 border-l theme-border pl-4">
                    <button 
                        onClick={onUndo} 
                        disabled={!canUndo} 
                        className={cx(buttonStyles.icon, 'h-8 w-8', !canUndo && 'opacity-30 cursor-not-allowed')}
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo2 size={16} />
                    </button>
                    <button 
                        onClick={onRedo} 
                        disabled={!canRedo} 
                        className={cx(buttonStyles.icon, 'h-8 w-8', !canRedo && 'opacity-30 cursor-not-allowed')}
                        title="Redo (Ctrl+Shift+Z)"
                    >
                        <Redo2 size={16} />
                    </button>
                </div>
            </div>

            <div className={components.host.headerActions}>
                <div className={components.host.tabShell}>
                    <button type="button" className={cx(buttonStyles.primary, components.host.tabActive)}>
                        Edit
                    </button>
                    <button type="button" onClick={onOpenImport} className={components.host.tabBtn}>
                        Insert JSON
                    </button>
                    <button type="button" onClick={onOpenAI} className={components.host.tabBtnWithIcon}>
                        <Sparkles size={12} /> AI Generate
                    </button>
                    <button type="button" onClick={onOpenResults} className={components.host.tabBtn}>
                        Results
                    </button>
                </div>

                <button 
                    type="button" 
                    onClick={onSave} 
                    className={cx(
                        buttonStyles.secondary, 
                        components.host.saveBtn,
                        saveStatus === 'offline' && 'text-amber-600',
                        saveStatus === 'error' && 'text-red-600'
                    )}
                >
                    {renderSaveStatus()}
                </button>

                <button
                    type="button"
                    onClick={onOpenCommandPalette}
                    className={cx(buttonStyles.secondary, 'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold')}
                    title="Open command palette (Ctrl+K)"
                >
                    <MonitorCog size={14} /> Ctrl+K
                </button>

                <button type="button" onClick={onLaunch} className={cx(buttonStyles.primary, components.host.launchBtn)}>
                    <Play size={14} fill="currentColor" /> INVITE ROOM
                </button>
            </div>

            <div className={components.host.headerActionsMobile} ref={menuRef}>
                <button type="button" onClick={onSave} className={cx(buttonStyles.secondary, components.host.saveBtn)}>
                    {renderSaveStatus()}
                </button>

                <div className={components.host.mobileMenuWrap}>
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen((prev) => !prev)}
                        className={cx(buttonStyles.secondary, 'rounded-xl px-3 py-2 text-xs font-semibold')}
                        aria-expanded={mobileMenuOpen}
                        aria-label="Open editor actions"
                    >
                        <EllipsisVertical size={14} />
                    </button>

                    {mobileMenuOpen && (
                        <div className={components.host.mobileMenuPanel}>
                            <button type="button" onClick={() => { setMobileMenuOpen(false); onOpenImport(); }} className={components.host.mobileMenuItem}>
                                <FileJson size={14} /> Insert JSON
                            </button>
                            <button type="button" onClick={() => { setMobileMenuOpen(false); onOpenAI(); }} className={components.host.mobileMenuItem}>
                                <Sparkles size={14} /> AI Generate
                            </button>
                            <div className={components.host.mobileMenuDivider} />
                            <button type="button" onClick={() => { setMobileMenuOpen(false); onOpenResults(); }} className={components.host.mobileMenuItem}>
                                <BarChart3 size={14} /> Results
                            </button>
                            <button type="button" onClick={() => { setMobileMenuOpen(false); onLaunch(); }} className={components.host.mobileMenuItem}>
                                <Play size={14} /> Invite Room
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default OrganizerEditHeader;
