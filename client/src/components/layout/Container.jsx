/* eslint-disable no-unused-vars */
const Container = ({ as: Tag = 'div', className = '', children }) => {
    return <Tag className={`app-container ${className}`.trim()}>{children}</Tag>;
};

export default Container;
