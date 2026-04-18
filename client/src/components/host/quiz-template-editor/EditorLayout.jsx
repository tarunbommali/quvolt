import { components } from '../../../styles/components';

/**
 * Editor page shell that composes the header, slide panel, canvas, and config sidebar.
 * @param {{ header: React.ReactNode, mobileShell?: React.ReactNode, slidePanel: React.ReactNode, canvasView: React.ReactNode, configSidebar: React.ReactNode, rootClassName?: string, rootStyle?: object }} props
 */
const EditorLayout = ({ header, mobileShell, slidePanel, canvasView, configSidebar, rootClassName = '', rootStyle }) => (
    <div className={`${components.host.editorRoot} ${rootClassName}`} style={rootStyle}>
        {header}
        {mobileShell}
        <div className={`${components.host.editorBody} hidden md:grid`}>
            {slidePanel}
            {canvasView}
            {configSidebar}
        </div>
    </div>
);

export default EditorLayout;
