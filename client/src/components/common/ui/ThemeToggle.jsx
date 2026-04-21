import { Moon, Sun } from 'lucide-react';
import { useUIStore } from '../../../stores/useUIStore';
import { cx } from '../../../styles/theme';

const ThemeToggle = ({ className = '', size = 18 }) => {
    const theme = useUIStore((state) => state.theme);
    const toggleTheme = useUIStore((state) => state.toggleTheme);
    const isDark = theme === 'dark';

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={cx('inline-flex items-center justify-center select-none outline-none focus:outline-none', className)}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={isDark}
        >
            {isDark ? <Sun size={size} /> : <Moon size={size} />}
        </button>
    );
};

export default ThemeToggle;
