import { textStyles as textTokens } from '../../styles/commonStyles';
import { components } from '../../styles/components';
import { cx } from '../../styles/theme';
import useOrganizerEditController from '../../hooks/useOrganizerEditController';
import OrganizerEditView from '../../components/organizerEdit/OrganizerEditView';

const QuizEditorPage = () => {
    const editor = useOrganizerEditController();
    const { activeQuiz, loading } = editor;

    if (loading || !activeQuiz) {
        return <div className={cx(components.organizer.loading, textTokens.bodyStrong)}>Loading editor...</div>;
    }

    return <OrganizerEditView editor={editor} />;
};

export default QuizEditorPage;

