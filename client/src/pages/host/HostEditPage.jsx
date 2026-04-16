import { textStyles as textTokens } from '../../styles/commonStyles';
import { components } from '../../styles/components';
import { cx } from '../../styles/theme';
import useHostEditController from '../../hooks/useHostEditController';
import HostEditView from '../../components/hostEdit/HostEditView'

const HostEditPage = () => {
    const editor = useHostEditController();
    const { activeQuiz, loading } = editor;

    if (loading || !activeQuiz) {
        return <div className={cx(components.host.loading, textTokens.bodyStrong)}>Loading editor...</div>;
    }

    return <HostEditView editor={editor} />;
};

export default HostEditPage;
