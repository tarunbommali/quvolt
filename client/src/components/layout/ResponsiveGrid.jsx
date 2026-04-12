const ResponsiveGrid = ({ className = '', children }) => {
    return <div className={`app-grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${className}`.trim()}>{children}</div>;
};

export default ResponsiveGrid;
