import { components } from '../../styles/components';

const EditorLayout = ({ header, slidePanel, canvasView, configSidebar }) => (
    <div className={components.organizer.editorRoot}>
        {header}
        <div className={components.organizer.editorBody}>
            {slidePanel}
            {canvasView}
            {configSidebar}
        </div>
    </div>
);

export default EditorLayout;