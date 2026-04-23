import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, X, Info, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { useAuthStore } from '../../stores/useAuthStore';
import { logoutUser as logoutService } from '../../features/auth/services/auth.service';
import { useSocketStore } from '../../stores/useSocketStore';
import ThemeToggle from './ui/ThemeToggle';
import { navbar } from '../../styles/navbar';
import { cx } from '../../styles/theme';
import { BrandLogo } from './BrandLogo';
import { useSubscriptionTheme } from '../../hooks/useSubscriptionTheme';

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
    const clearAuth = useAuthStore((state) => state.clearAuth);
    const connectionState = useSocketStore((state) => state.connectionState);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false);
    const profileMenuRef = useRef(null);
    const isProfileMenuOpenRef = useRef(isProfileMenuOpen);
    isProfileMenuOpenRef.current = isProfileMenuOpen;
    const role = user?.role || 'guest';
    const isHost = role === 'host' || role === 'admin';
    const isParticipant = Boolean(user) && !isHost;
    const { theme, plan } = useSubscriptionTheme();

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
            { label: 'Studio', to: '/studio' },
            { label: 'History', to: '/history' },
            { label: 'Billing', to: '/billing' },
        ]
        : isParticipant
            ? [
                { label: 'Join', to: '/join' },
                { label: 'History', to: '/p/history' },
            ]
            : [
                { label: 'Join', to: '/join' },
            ];

    // Profile dropdown items — same for every authenticated role.
    // /profile and /profile/edit are registered for all roles in AppRoutes.
    const accountItems = isHost ? [
        { label: 'Profile', to: '/profile' },
        { label: 'Studio Settings', to: '/studio/settings' },
        { label: 'Account Settings', to: '/profile/edit' },
        { label: 'Upgrade', to: '/upgrade' },
    ] : [
        { label: 'Profile', to: '/profile' },
        { label: 'Settings', to: '/profile/edit' },
    ];


    const closeAllMenus = () => {
        setIsMobileMenuOpen(false);
        setIsProfileMenuOpen(false);
        setIsLearnMoreOpen(false);
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

    // Single stable outside-click listener (mounted once, never toggled).
    // stopPropagation on the trigger button ensures the toggle is
    // always handled exclusively by the button's onClick.
    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (
                isProfileMenuOpenRef.current &&
                profileMenuRef.current &&
                !profileMenuRef.current.contains(event.target)
            ) {
                setIsProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []); // empty deps — listener lives for component lifetime

    const handleMobilePanelClick = (event) => {
        if (event.target === event.currentTarget) {
            closeAllMenus();
        }
    };

    const handleLogout = async () => {
        await logoutService();
        clearAuth();
    };

    return (
        <nav className={navbar.container} aria-label="Primary navigation">
            <div className={navbar.inner}>
                <Link to="/" className={navbar.brandLink} aria-label="Quvolt home">
                    <BrandLogo />
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


                    <ThemeToggle className={navbar.iconButton} />


                    {/* Removed Open Studio button as requested */}

                    {/* Logged out: Log in link */}
                    {!user ? (
                        <Link to="/login" className={navbar.secondaryButton} onClick={closeAllMenus}>
                            Log in
                        </Link>
                    ) : null}

                    {/* Logged in: avatar dropdown + inline logout button */}
                    {user ? (
                        <>
                            <div
                                ref={profileMenuRef}
                                className={navbar.profileMenuWrap}
                                onMouseEnter={() => {
                                    clearTimeout(profileMenuRef.current?.closeTimeout);
                                    setIsProfileMenuOpen(true);
                                }}
                                onMouseLeave={() => {
                                    profileMenuRef.current.closeTimeout = setTimeout(() => {
                                        setIsProfileMenuOpen(false);
                                    }, 200);
                                }}
                            >
                                <button
                                    type="button"
                                    aria-label="Account menu"
                                    aria-expanded={isProfileMenuOpen}
                                    onClick={() => {
                                        // Still allow click to toggle for touch screens
                                        setIsProfileMenuOpen((prev) => !prev);
                                    }}
                                >
                                    <span className="relative inline-block">
                                        {/* Avatar */}
                                        <span className={navbar.avatar}>
                                            {user.profilePhoto ? (
                                                <img src={user.profilePhoto} alt="Profile" className={navbar.avatarImage} />
                                            ) : (
                                                <span>{initials}</span>
                                            )}
                                        </span>

                                        {/* Green status dot */}
                                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[var(--qb-background)]" />
                                    </span>
                                </button>

                                <AnimatePresence>
                                    {isProfileMenuOpen ? (
                                        <Motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.15, ease: "easeOut" }}
                                            className={`${navbar.dropdown} shadow-2xl backdrop-blur-xl bg-white/90 dark:bg-black/80 border border-black/5 dark:border-white/10`}
                                            role="menu"
                                            aria-label="Account menu"
                                        >
                                            {/* User identity header */}
                                            <div className="px-3 py-2 border-b theme-border mb-1">
                                                <p className="text-sm font-semibold theme-text-primary truncate">{user.name || 'User'}</p>
                                                <p className="text-xs theme-text-muted truncate">{user.email}</p>
                                                {plan && (plan !== 'FREE' || isHost) && (
                                                    <span className={cx(
                                                        "mt-1 inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                                        plan === 'TEAMS'
                                                            ? "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800/50"
                                                            : plan === 'CREATOR'
                                                                ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50"
                                                                : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                                                    )}>
                                                        {plan === 'FREE' ? 'Free Plan' : `${plan} Plan`}
                                                    </span>
                                                )}
                                            </div>
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

                                            <div className="border-t theme-border mt-1 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsLearnMoreOpen(!isLearnMoreOpen);
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-sm font-medium theme-text-secondary hover:theme-text-primary hover:bg-[var(--qb-surface-2)] transition-colors flex items-center justify-between"
                                                >
                                                    <span className="flex items-center gap-2"><Info size={14} className="opacity-70" /> Learn more</span>
                                                    <ChevronRight size={14} className={`opacity-50 transition-transform ${isLearnMoreOpen ? 'rotate-90' : ''}`} />
                                                </button>

                                                {isLearnMoreOpen && (
                                                    <div className="pl-6 py-1 pr-2 space-y-0.5 bg-[var(--qb-surface-2)]/50 border-y theme-border my-1">
                                                        <Link to="/legal/terms-and-conditions" target="_blank" rel="noopener noreferrer" onClick={closeAllMenus} className="block px-3 py-1.5 text-[13px] theme-text-muted hover:theme-text-primary transition-colors rounded-md hover:bg-[var(--qb-surface-soft)]">Terms & Conditions</Link>
                                                        <Link to="/legal/privacy-policy" target="_blank" rel="noopener noreferrer" onClick={closeAllMenus} className="block px-3 py-1.5 text-[13px] theme-text-muted hover:theme-text-primary transition-colors rounded-md hover:bg-[var(--qb-surface-soft)]">Privacy Policy</Link>
                                                        <Link to="/legal/refund-policy" target="_blank" rel="noopener noreferrer" onClick={closeAllMenus} className="block px-3 py-1.5 text-[13px] theme-text-muted hover:theme-text-primary transition-colors rounded-md hover:bg-[var(--qb-surface-soft)]">Refund & Cancellation</Link>
                                                        <Link to="/legal/cookie-policy" target="_blank" rel="noopener noreferrer" onClick={closeAllMenus} className="block px-3 py-1.5 text-[13px] theme-text-muted hover:theme-text-primary transition-colors rounded-md hover:bg-[var(--qb-surface-soft)]">Cookie Policy</Link>
                                                        <Link to="/legal/disclaimer" target="_blank" rel="noopener noreferrer" onClick={closeAllMenus} className="block px-3 py-1.5 text-[13px] theme-text-muted hover:theme-text-primary transition-colors rounded-md hover:bg-[var(--qb-surface-soft)]">Disclaimer</Link>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="border-t theme-border mt-1 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={handleLogout}
                                                    className={cx(navbar.dropdownItem, navbar.dropdownDanger)}
                                                    role="menuitem"
                                                >
                                                    <LogOut size={16} />
                                                    Logout
                                                </button>
                                            </div>
                                        </Motion.div>
                                    ) : null}
                                </AnimatePresence>
                            </div>
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
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-pulse"></span>
                                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                                    </span>
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
                                    <button type="button" onClick={handleLogout} className={navbar.mobileLogoutButton}>
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
