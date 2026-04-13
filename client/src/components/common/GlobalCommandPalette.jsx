import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { components } from '../../styles/components';
import { cx } from '../../styles/theme';
import { useAuthStore } from '../../stores/useAuthStore';

const PALETTE_ITEMS = [
    {
        id: 'home',
        label: 'Go to Home',
        description: 'Open public landing page',
        to: '/',
        roles: ['guest', 'participant', 'organizer', 'admin'],
        keywords: ['landing', 'public'],
    },
    {
        id: 'login',
        label: 'Open Login',
        description: 'Sign in to your account',
        to: '/login',
        roles: ['guest'],
        keywords: ['auth', 'signin'],
    },
    {
        id: 'register',
        label: 'Open Register',
        description: 'Create a new account',
        to: '/register',
        roles: ['guest'],
        keywords: ['signup', 'create account'],
    },
    {
        id: 'join',
        label: 'Join Session',
        description: 'Join an active quiz room',
        to: '/join',
        roles: ['participant', 'organizer', 'admin'],
        keywords: ['room code', 'quiz'],
    },
    {
        id: 'studio',
        label: 'Open Studio',
        description: 'Manage templates and sessions',
        to: '/studio',
        roles: ['organizer', 'admin'],
        keywords: ['dashboard', 'host'],
    },
    {
        id: 'billing',
        label: 'Open Billing',
        description: 'Manage subscription and payouts',
        to: '/billing',
        roles: ['organizer', 'admin'],
        keywords: ['plan', 'subscription', 'payments'],
    },
    {
        id: 'analytics',
        label: 'Open Analytics',
        description: 'Review performance metrics',
        to: '/analytics',
        roles: ['participant', 'organizer', 'admin'],
        keywords: ['reports', 'insights'],
    },
    {
        id: 'history',
        label: 'Open History',
        description: 'View past quiz sessions',
        to: '/history',
        roles: ['participant', 'organizer', 'admin'],
        keywords: ['records', 'results'],
    },
    {
        id: 'profile',
        label: 'Open Profile',
        description: 'View your account profile',
        to: '/profile',
        roles: ['participant', 'organizer', 'admin'],
        keywords: ['account', 'settings'],
    },
    {
        id: 'profile-edit',
        label: 'Edit Profile',
        description: 'Update your profile details',
        to: '/profile/edit',
        roles: ['participant', 'organizer', 'admin'],
        keywords: ['edit account'],
    },
];

const normalizeRole = (user) => {
    if (!user) return 'guest';
    if (user.role === 'organizer' || user.role === 'admin') return user.role;
    return 'participant';
};

const matchesQuery = (item, query) => {
    if (!query) return true;
    const haystack = [item.label, item.description, ...(item.keywords || [])]
        .join(' ')
        .toLowerCase();
    return query.split(/\s+/).every((term) => haystack.includes(term));
};

const GlobalCommandPalette = () => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();
    const user = useAuthStore((state) => state.user);
    const inputRef = useRef(null);

    const role = normalizeRole(user);

    const items = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return PALETTE_ITEMS
            .filter((item) => item.roles.includes(role))
            .filter((item) => matchesQuery(item, normalizedQuery));
    }, [query, role]);

    useEffect(() => {
        setActiveIndex(0);
    }, [query, role]);

    useEffect(() => {
        if (!open) return;
        const timeout = window.setTimeout(() => {
            inputRef.current?.focus();
        }, 0);
        return () => window.clearTimeout(timeout);
    }, [open]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            const isPaletteShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
            if (isPaletteShortcut) {
                event.preventDefault();
                setOpen((previous) => !previous);
                return;
            }

            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (!open) {
            setQuery('');
            return undefined;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);

    const closePalette = () => {
        setOpen(false);
    };

    const handleSelect = (item) => {
        if (!item?.to || item.to === location.pathname) {
            closePalette();
            return;
        }

        navigate(item.to);
        closePalette();
    };

    const handleInputKeyDown = (event) => {
        if (!items.length) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((previous) => (previous + 1) % items.length);
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((previous) => (previous - 1 + items.length) % items.length);
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            handleSelect(items[activeIndex]);
        }
    };

    if (!open) return null;

    return (
        <div className={components.commandPalette.overlay} onClick={closePalette} role="presentation">
            <div className={components.commandPalette.wrap} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Global search command palette">
                <div className={components.commandPalette.panel}>
                    <div className={components.commandPalette.searchRow}>
                        <Search size={16} className={components.commandPalette.searchIcon} />
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            onKeyDown={handleInputKeyDown}
                            className={components.commandPalette.searchInput}
                            placeholder="Search pages, commands, and routes..."
                            aria-label="Search commands"
                        />
                        <span className={components.commandPalette.hint}>Enter</span>
                    </div>

                    <div className={components.commandPalette.list}>
                        {items.length ? (
                            items.map((item, index) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handleSelect(item)}
                                    className={cx(
                                        components.commandPalette.item,
                                        index === activeIndex ? components.commandPalette.itemActive : components.commandPalette.itemIdle,
                                    )}
                                >
                                    <div className={components.commandPalette.itemTextWrap}>
                                        <p className={components.commandPalette.itemTitle}>{item.label}</p>
                                        <p className={components.commandPalette.itemDesc}>{item.description}</p>
                                    </div>
                                    <span className={components.commandPalette.itemMeta}>{item.to}</span>
                                </button>
                            ))
                        ) : (
                            <div className={components.commandPalette.empty}>No matching command found.</div>
                        )}
                    </div>

                    <div className={components.commandPalette.footer}>
                        <span>Ctrl+K to open</span>
                        <span>Esc to close</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalCommandPalette;
