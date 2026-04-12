const Card = ({ children, className = '' }) => {
    return (
        <div className={`surface-card ${className}`.trim()}>
            {children}
        </div>
    );
};

export default Card;
