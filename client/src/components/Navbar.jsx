import { Link, NavLink } from 'react-router-dom';
import { LogOut, Zap, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { useUIStore } from '../stores/useUIStore';
import { useSocketStore } from '../stores/useSocketStore';
import { navbar } from '../styles/navbar';
import { cx } from '../styles/theme';

const STATUS_STYLES = {
    connected: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300',
    reconnecting: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
    connecting: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300',
    disconnected: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300',
};

const Navbar = () => {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const theme = useUIStore((state) => state.theme);
    const toggleTheme = useUIStore((state) => state.toggleTheme);
    const connectionState = useSocketStore((state) => state.connectionState);
    const isOrganizer = user?.role === 'organizer' || user?.role === 'admin';
    const studioHref = isOrganizer ? '/studio' : '/join';
    const initials = user?.name
        ? user.name
            .split(' ')
            .map(part => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
        : 'U';

    const navItems = user
        ? [
            { label: 'Home', to: '/', end: true },
            { label: isOrganizer ? 'Studio' : 'Join', to: studioHref },
            { label: 'Analytics', to: '/analytics' },
            { label: 'History', to: '/history' },
            { label: 'Profile', to: '/profile' },
        ]
        : [
            { label: 'Home', to: '/', end: true },
            { label: 'Join Session', to: '/join' },
        ];

    const primaryAction = user
        ? { label: isOrganizer ? 'Open Studio' : 'Join session', to: studioHref }
        : { label: 'Get Started', to: '/register' };

    const secondaryAction = user
        ? { label: isOrganizer ? 'Analytics' : 'History', to: isOrganizer ? '/analytics' : '/history' }
        : { label: 'Log in', to: '/login' };

    return (
        <nav className={navbar.container} aria-label="Primary navigation">
            <div className={navbar.inner}>
                <Link to="/" className={navbar.brandLink} aria-label="Quvolt home">
                    
                    <span className={navbar.brandTitle}>QU<span className={navbar.brandAccent}>VOLT</span></span>
                </Link>

                <div className={navbar.menu}>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) => (isActive ? navbar.navLinkActive : navbar.navLink)}
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </div>

                <div className={navbar.actions}>
                    <span className={cx(navbar.badge, STATUS_STYLES[connectionState] || STATUS_STYLES.disconnected)}>
                        <span className={navbar.badgeDot} />
                        LIVE SYNC
                    </span>

                    <button
                        type="button"
                        onClick={toggleTheme}
                        className={navbar.iconButton}
                        title="Toggle light/dark mode"
                        aria-label="Toggle light/dark mode"
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    <div className={navbar.ctaGroup}>
                        <Link to={primaryAction.to} className={navbar.primaryButton}>
                            {primaryAction.label}
                        </Link>
                        <Link to={secondaryAction.to} className={navbar.secondaryButton}>
                            {secondaryAction.label}
                        </Link>
                    </div>

                    {user ? (
                        <>
                            <Link
                                to="/profile"
                                className={navbar.avatar}
                                title="Open profile"
                                aria-label="Open profile"
                            >
                                {user.profilePhoto ? (
                                    <img src={user.profilePhoto} alt="Profile" className={navbar.avatarImage} />
                                ) : (
                                    <span>{initials}</span>
                                )}
                            </Link>
                            <button
                                type="button"
                                onClick={logout}
                                className={navbar.iconButton}
                                aria-label="Log out"
                                title="Log out"
                            >
                                <LogOut size={18} />
                            </button>
                        </>
                    ) : null}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
