import { buttonStyles } from '../../styles/buttonStyles';

const variantClasses = {
    default: buttonStyles.neutral,
    primary: buttonStyles.primary,
    secondary: buttonStyles.secondary,
    danger: buttonStyles.danger,
    ghost: buttonStyles.ghost,
};

const sizeClasses = {
    sm: buttonStyles.sizeSm,
    md: buttonStyles.sizeMd,
    lg: buttonStyles.sizeLg,
};

const Button = ({
    children,
    className = '',
    type = 'button',
    variant = 'default',
    size = 'md',
    ...props
}) => {
    const hasCustomTone = /\b(bg-(?!opacity)|text-(white|black|slate|gray|red|green|emerald|amber|yellow|indigo|violet|blue|primary)|border-(red|green|emerald|amber|yellow|indigo|violet|blue|gray|slate|white|black|transparent))/i.test(className);

    return (
        <button
            type={type}
            className={`${buttonStyles.base} ${hasCustomTone ? '' : (variantClasses[variant] || variantClasses.default)} ${sizeClasses[size] || sizeClasses.md} ${className}`.trim()}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
