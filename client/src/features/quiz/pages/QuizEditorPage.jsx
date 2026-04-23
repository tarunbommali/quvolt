import { textStyles as textTokens } from '../../../styles/commonStyles';

import usehostEditController from '../../../hooks/useHostEditController'
import hostEditView from '../../../components/hostEdit/hostEditView';
import { components, cx } from '../../../styles/index';

const QuizEditorPage = () => {
    const editor = usehostEditController();
    const { activeQuiz, loading } = editor;

    if (loading || !activeQuiz) {
        return <div className={cx(components.host.loading, textTokens.bodyStrong)}>Loading editor...</div>;
    }

    return <hostEditView editor={editor} />;
};

export default QuizEditorPage;

