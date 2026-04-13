import { useMemo, useState } from 'react';
import { motion as Motion } from 'framer-motion';
import { buttonStyles } from '../../styles/buttonStyles';
import { cx } from '../../styles/theme';

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
    onClick,
    ...props
}) => {
    const hasCustomTone = /\b(bg-(?!opacity)|text-(white|black|slate|gray|red|green|emerald|amber|yellow|indigo|violet|blue|primary)|border-(red|green|emerald|amber|yellow|indigo|violet|blue|gray|slate|white|black|transparent))/i.test(className);
    const [ripples, setRipples] = useState([]);

    const toneClass = useMemo(() => {
        if (hasCustomTone) return '';
        return variantClasses[variant] || variantClasses.default;
    }, [hasCustomTone, variant]);

    const handleClick = (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const sizePx = Math.max(rect.width, rect.height) * 1.2;
        const x = event.clientX ? event.clientX - rect.left - sizePx / 2 : rect.width / 2 - sizePx / 2;
        const y = event.clientY ? event.clientY - rect.top - sizePx / 2 : rect.height / 2 - sizePx / 2;
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        setRipples((prev) => [...prev, { id, x, y, sizePx }]);
        window.setTimeout(() => {
            setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
        }, 520);

        if (typeof onClick === 'function') {
            onClick(event);
        }
    };

    return (
        <Motion.button
            type={type}
            whileTap={{ scale: 0.985 }}
            className={cx(
                buttonStyles.base,
                toneClass,
                sizeClasses[size] || sizeClasses.md,
                className,
            )}
            onClick={handleClick}
            {...props}
        >
            {ripples.map((ripple) => (
                <span
                    key={ripple.id}
                    className={buttonStyles.rippleDot}
                    style={{
                        width: `${ripple.sizePx}px`,
                        height: `${ripple.sizePx}px`,
                        left: `${ripple.x}px`,
                        top: `${ripple.y}px`,
                    }}
                />
            ))}
            {children}
        </Motion.button>
    );
};

export default Button;
