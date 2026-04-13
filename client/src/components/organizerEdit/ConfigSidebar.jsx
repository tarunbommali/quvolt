import ConfigPanel from './ConfigPanel';

/**
 * Config sidebar wrapper for the organizer editor.
 * @param {object} props
 */
const ConfigSidebar = ({ mobile = false, ...props }) => <ConfigPanel mobile={mobile} {...props} />;

export default ConfigSidebar;