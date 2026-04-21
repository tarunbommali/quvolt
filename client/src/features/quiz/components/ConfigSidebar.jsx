import ConfigPanel from './ConfigPanel';

/**
 * Config sidebar wrapper for the host editor.
 * @param {object} props
 */
const ConfigSidebar = ({ mobile = false, ...props }) => <ConfigPanel mobile={mobile} {...props} />;

export default ConfigSidebar;

