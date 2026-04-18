import { cx } from '../styles/theme';
import { useSubscriptionTheme } from '../hooks/useSubscriptionTheme';
import { motion } from 'framer-motion';

export const BrandLogo = ({ className, showBadge = true }) => {
    const { theme, plan } = useSubscriptionTheme();
    const isSpecialPlan = plan === 'PRO' || plan === 'PREMIUM';
    
    return (
        <div className={cx('flex items-center gap-2 group', className)}>
            <motion.div 
                className={cx(
                    'text-xl sm:text-2xl transition-all duration-300',
                    theme.typography.logoWeight,
                    theme.typography.letterSpacing,
                    theme.typography.logoStyle
                )}
                layout
            >
                QUVOLT
            </motion.div>
            
            {showBadge && isSpecialPlan && (
                <motion.span 
                    initial={{ opacity: 0, scale: 0.9, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className={cx(
                        'hidden sm:inline-flex px-2 py-0.5 mt-0.5 rounded-full text-[10px] sm:text-xs uppercase whitespace-nowrap',
                        theme.typography.bodyWeight,
                        theme.colors.badgeBg,
                        theme.colors.badgeText,
                        // Add some premium subtle glow boundary if needed
                        plan === 'PREMIUM' ? 'shadow-sm shadow-violet-500/20 ring-1 ring-violet-500/10' : ''
                    )}
                >
                    {theme.label}
                </motion.span>
            )}
        </div>
    );
};
