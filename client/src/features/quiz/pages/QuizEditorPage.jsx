import { textStyles as textTokens } from '../../../styles/commonStyles';
import { components } from '../../../styles/components';
import { cx } from '../../../styles/theme';
import usehostEditController from '../../../hooks/useHostEditController'
import hostEditView from '../../../components/hostEdit/hostEditView';

const QuizEditorPage = () => {
    const editor = usehostEditController();
    const { activeQuiz, loading } = editor;

    if (loading || !activeQuiz) {
        return <div className={cx(components.host.loading, textTokens.bodyStrong)}>Loading editor...</div>;
    }

    return <hostEditView editor={editor} />;
};

export default QuizEditorPage;


