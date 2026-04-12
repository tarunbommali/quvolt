/* eslint-disable no-unused-vars */
const Section = ({ as: Tag = 'section', className = '', children }) => {
    return <Tag className={`app-section ${className}`.trim()}>{children}</Tag>;
};

export default Section;
