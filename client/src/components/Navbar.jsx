import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, X } from 'lucide-react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { useAuthStore } from '../stores/useAuthStore';
import { useSocketStore } from '../stores/useSocketStore';
import ThemeToggle from './ui/ThemeToggle';
import { navbar } from '../styles/navbar';
import { cx } from '../styles/theme';

const STATUS_STYLES = {
    connected: 'theme-status-success',
    reconnecting: 'theme-status-warning',
    connecting: 'bg-[color-mix(in_srgb,var(--qb-primary)_14%,var(--qb-surface-1))] text-[var(--qb-primary)]',
    disconnected: 'theme-surface-soft theme-text-muted',
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
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef(null);
    const role = user?.role || 'guest';
    const isHost = role === 'organizer' || role === 'admin';
    const isParticipant = Boolean(user) && !isHost;

    const primaryCta = isHost
        ? { label: 'Open Studio', to: '/studio' }
        : isParticipant
            ? { label: 'Join Session', to: '/join' }
            : { label: 'Get Started', to: '/register' };
    const initials = user?.name
        ? user.name
            .split(' ')
            .map(part => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
        : 'U';

    const navItems = isHost
        ? [
            { label: 'Home', to: '/', end: true },
            { label: 'Studio', to: '/studio' },
            { label: 'Analytics', to: '/analytics' },
            { label: 'History', to: '/history' },
        ]
        : isParticipant
            ? [
                { label: 'Home', to: '/', end: true },
                { label: 'Join', to: '/join' },
                { label: 'Analytics', to: '/analytics' },
                { label: 'History', to: '/history' },
            ]
            : [
                { label: 'Home', to: '/', end: true },
                { label: 'Join', to: '/join' },
            ];

    const accountItems = isHost
        ? [
            { label: 'Profile', to: '/profile' },
            { label: 'Billing', to: '/billing' },
            { label: 'Settings', to: '/profile/edit' },
        ]
        : [
            { label: 'Profile', to: '/profile' },
            { label: 'Settings', to: '/profile/edit' },
        ];

    const closeAllMenus = () => {
        setIsMobileMenuOpen(false);
        setIsProfileMenuOpen(false);
    };

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

    useEffect(() => {
        if (!isProfileMenuOpen) {
            return undefined;
        }

        const handleOutsideClick = (event) => {
            if (!profileMenuRef.current?.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isProfileMenuOpen]);

    const handleMobilePanelClick = (event) => {
        if (event.target === event.currentTarget) {
            closeAllMenus();
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
                            onClick={closeAllMenus}
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </div>

                <div className={navbar.center} />

                <div className={navbar.actions}>
                    <span className={cx(navbar.badge, STATUS_STYLES[connectionState] || STATUS_STYLES.disconnected)}>
                        <span className={navbar.badgeDot} />
                        LIVE SYNC
                    </span>

                    <ThemeToggle className={navbar.iconButton} />

                    <Link to={primaryCta.to} className={navbar.primaryButton} onClick={closeAllMenus}>
                        {primaryCta.label}
                    </Link>

                    {!user ? (
                        <Link to="/login" className={navbar.secondaryButton} onClick={closeAllMenus}>
                            Log in
                        </Link>
                    ) : null}

                    {user ? (
                        <div ref={profileMenuRef} className={navbar.profileMenuWrap}>
                            <button
                                type="button"
                                className={navbar.avatarTrigger}
                                aria-label="Open account menu"
                                aria-expanded={isProfileMenuOpen}
                                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                            >
                                <span className={navbar.avatar}>
                                    {user.profilePhoto ? (
                                        <img src={user.profilePhoto} alt="Profile" className={navbar.avatarImage} />
                                    ) : (
                                        <span>{initials}</span>
                                    )}
                                </span>
                                <ChevronDown size={16} className={navbar.avatarCaret} />
                            </button>

                            {isProfileMenuOpen ? (
                                <div className={navbar.dropdown} role="menu" aria-label="Account menu">
                                    {accountItems.map(({ label, to }) => (
                                        <Link
                                            key={label}
                                            to={to}
                                            className={navbar.dropdownItem}
                                            role="menuitem"
                                            onClick={closeAllMenus}
                                        >
                                            {label}
                                        </Link>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={logout}
                                        className={cx(navbar.dropdownItem, navbar.dropdownDanger)}
                                        role="menuitem"
                                    >
                                        <LogOut size={16} />
                                        Logout
                                    </button>
                                </div>
                            ) : null}
                        </div>
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
                        onClick={() => {
                            setIsProfileMenuOpen(false);
                            setIsMobileMenuOpen((open) => !open);
                        }}
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
                            onClick={closeAllMenus}
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
                                            onClick={closeAllMenus}
                                        >
                                            <span>{item.label}</span>
                                            <span aria-hidden="true">↗</span>
                                        </NavLink>
                                    </Motion.div>
                                ))}
                            </div>

                            <div className={navbar.mobileBottomSpacer} />

                            <Motion.div variants={mobileItemVariants} className={navbar.mobileCtaGroup}>
                                <Link to={primaryCta.to} className={navbar.mobilePrimaryButton} onClick={closeAllMenus}>
                                    {primaryCta.label}
                                </Link>

                                {!user ? (
                                    <Link to="/login" className={navbar.mobileSecondaryButton} onClick={closeAllMenus}>
                                        Log in
                                    </Link>
                                ) : null}

                                {user ? (
                                    <>
                                        <p className={navbar.mobileSectionTitle}>Account</p>
                                        {accountItems.map(({ label, to }) => (
                                            <Link key={label} to={to} className={navbar.mobileSecondaryButton} onClick={closeAllMenus}>
                                                {label}
                                            </Link>
                                        ))}
                                    </>
                                ) : null}

                                {user ? (
                                    <button type="button" onClick={logout} className={navbar.mobileLogoutButton}>
                                        <LogOut size={16} />
                                        Logout
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
