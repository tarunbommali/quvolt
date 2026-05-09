import { textStyles as textTokens } from '../../../styles/commonStyles';

import usehostEditController from '../../../hooks/useHostEditController'
import hostEditView from '../../../components/hostEdit/hostEditView';
import { components, cx } from '../../../styles/index';
import { EditorProvider } from '../../host/context/EditorContext.jsx';

const QuizEditorPage = () => {
    const editor = usehostEditController();
    const { activeQuiz, loading } = editor;

    if (loading || !activeQuiz) {
        return <div className={cx(components.host.loading, textTokens.bodyStrong)}>Loading editor...</div>;
    }

    return (
        <EditorProvider value={editor}>
            <hostEditView editor={editor} />
        </EditorProvider>
    );
};

export default QuizEditorPage;
