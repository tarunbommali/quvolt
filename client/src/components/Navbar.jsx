import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { useAuthStore } from '../stores/useAuthStore';
import { useSocketStore } from '../stores/useSocketStore';
import ThemeToggle from './ui/ThemeToggle';
import { navbar } from '../styles/navbar';
import { cx } from '../styles/theme';

const STATUS_STYLES = {
    connected: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300',
    reconnecting: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
    connecting: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300',
    disconnected: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300',
};

const mobilePanelVariants = {
    closed: {
        opacity: 0,
        y: -16,
        scale: 0.985,
        transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
    },
    open: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.34,
            ease: [0.16, 1, 0.3, 1],
            when: 'beforeChildren',
            staggerChildren: 0.08,
            delayChildren: 0.05,
        },
    },
};

const mobileItemVariants = {
    closed: { opacity: 0, x: -14 },
    open: { opacity: 1, x: 0, transition: { duration: 0.22, ease: 'easeOut' } },
};

const Navbar = () => {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const connectionState = useSocketStore((state) => state.connectionState);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

    useEffect(() => {
        if (!isMobileMenuOpen) {
            return undefined;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isMobileMenuOpen]);

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    const handleMobilePanelClick = (event) => {
        if (event.target === event.currentTarget) {
            closeMobileMenu();
        }
    };

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
                            onClick={closeMobileMenu}
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

                    <ThemeToggle className={navbar.iconButton} />

                    <div className={navbar.ctaGroup}>
                        <Link to={primaryAction.to} className={navbar.primaryButton} onClick={closeMobileMenu}>
                            {primaryAction.label}
                        </Link>
                        <Link to={secondaryAction.to} className={navbar.secondaryButton} onClick={closeMobileMenu}>
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

                <div className={navbar.mobileActions}>
                    <ThemeToggle className={navbar.mobileToolbarButton} size={18} />
                    <button
                        type="button"
                        className={navbar.mobileMenuButton}
                        aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={isMobileMenuOpen}
                        aria-controls="mobile-navigation"
                        onClick={() => setIsMobileMenuOpen((open) => !open)}
                    >
                        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            <AnimatePresence initial={false}>
                {isMobileMenuOpen ? (
                    <>
                        <Motion.div
                            className={navbar.mobileBackdrop}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            aria-hidden="true"
                            onClick={closeMobileMenu}
                        />

                        <Motion.div
                            id="mobile-navigation"
                            className={cx(navbar.mobilePanel, navbar.mobilePanelOpen)}
                            initial="closed"
                            animate="open"
                            exit="closed"
                            variants={mobilePanelVariants}
                            aria-hidden={!isMobileMenuOpen}
                            onClick={handleMobilePanelClick}
                        >
                            <Motion.div variants={mobileItemVariants} className={navbar.mobileBadgeRow}>
                                <span className={cx(navbar.badge, STATUS_STYLES[connectionState] || STATUS_STYLES.disconnected)}>
                                    <span className={navbar.badgeDot} />
                                    LIVE SYNC
                                </span>
                                <span className={navbar.mobileHint}>Quick links</span>
                            </Motion.div>

                            <div className={navbar.mobileMenu}>
                                {navItems.map((item) => (
                                    <Motion.div key={item.to} variants={mobileItemVariants}>
                                        <NavLink
                                            to={item.to}
                                            end={item.end}
                                            className={({ isActive }) => (isActive ? navbar.mobileNavLinkActive : navbar.mobileNavLink)}
                                            onClick={closeMobileMenu}
                                        >
                                            <span>{item.label}</span>
                                            <span aria-hidden="true">↗</span>
                                        </NavLink>
                                    </Motion.div>
                                ))}
                            </div>

                            <div className={navbar.mobileBottomSpacer} />

                            <Motion.div variants={mobileItemVariants} className={navbar.mobileCtaGroup}>
                                <Link to={primaryAction.to} className={navbar.mobilePrimaryButton} onClick={closeMobileMenu}>
                                    {primaryAction.label}
                                </Link>
                                <Link to={secondaryAction.to} className={navbar.mobileSecondaryButton} onClick={closeMobileMenu}>
                                    {secondaryAction.label}
                                </Link>

                                {user ? (
                                    <button type="button" onClick={logout} className={navbar.mobileLogoutButton}>
                                        <LogOut size={16} />
                                        Log out
                                    </button>
                                ) : null}
                            </Motion.div>
                        </Motion.div>
                    </>
                ) : null}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;
