import { ChevronLeft, Play, Save, Sparkles } from 'lucide-react';
import { buttonStyles } from '../../styles/buttonStyles';
import { textStyles as textTokens } from '../../styles/commonStyles';
import { components } from '../../styles/components';
import { cx } from '../../styles/theme';

/**
 * Editor header with navigation and primary actions.
 * @param {{ title: string, isSaving: boolean, onBack: () => void, onOpenImport: () => void, onOpenAI: () => void, onOpenResults: () => void, onSave: () => void, onLaunch: () => void }} props
 */
const OrganizerEditHeader = ({
    title,
    isSaving,
    onBack,
    onOpenImport,
    onOpenAI,
    onOpenResults,
    onSave,
    onLaunch,
}) => {
    return (
        <header className={components.organizer.header}>
            <div className={components.organizer.headerLeft}>
                <button type="button" onClick={onBack} className={cx(buttonStyles.icon, components.organizer.navBack)}>
                    <ChevronLeft size={20} />
                </button>
                <h1 className={cx(textTokens.title, components.organizer.titleClamp)}>{title}</h1>
            </div>

            <div className={components.organizer.headerActions}>
                <div className={components.organizer.tabShell}>
                    <button type="button" className={cx(buttonStyles.primary, components.organizer.tabActive)}>
                        Edit
                    </button>
                    <button type="button" onClick={onOpenImport} className={components.organizer.tabBtn}>
                        Insert JSON
                    </button>
                    <button type="button" onClick={onOpenAI} className={components.organizer.tabBtnWithIcon}>
                        <Sparkles size={12} /> AI Generate
                    </button>
                    <button type="button" onClick={onOpenResults} className={components.organizer.tabBtn}>
                        Results
                    </button>
                </div>

                <button type="button" onClick={onSave} className={cx(buttonStyles.secondary, components.organizer.saveBtn)}>
                    <Save size={14} /> {isSaving ? 'AUTO SAVING...' : 'SAVE'}
                </button>

                <button type="button" onClick={onLaunch} className={cx(buttonStyles.primary, components.organizer.launchBtn)}>
                    <Play size={14} fill="currentColor" /> INVITE ROOM
                </button>
            </div>
        </header>
    );
};

export default OrganizerEditHeader;
