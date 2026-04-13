import { components } from '../../styles/components';

/**
 * Editor page shell that composes the header, slide panel, canvas, and config sidebar.
 * @param {{ header: React.ReactNode, slidePanel: React.ReactNode, canvasView: React.ReactNode, configSidebar: React.ReactNode }} props
 */
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