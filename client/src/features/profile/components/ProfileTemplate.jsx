import { motion as Motion } from 'framer-motion';
import PageHeader from '../../../components/layout/PageHeader';
import { useSubscriptionTheme } from '../../../hooks/useSubscriptionTheme';

import { User, ShieldCheck, Mail, Sparkles, CheckCircle, Phone } from 'lucide-react';
import { cx, layout, typography, cards } from '../../../styles/index';

const ProfileTemplate = ({
    title,
    subtitle,
    breadcrumbs,
    actions,
    avatarSrc,
    name,
    email,
    mobileNumber,
    plan,
    role,
    verified,
    children,
}) => {
    const { theme, isPro } = useSubscriptionTheme();

    const isEdit = title?.toLowerCase().includes('edit');

    return (
        <div className={cx(layout.page, 'min-h-screen')}>
            {/* ── BreadCrumbs ────────────────────────────────────────────── */}
            <PageHeader
                breadcrumbs={breadcrumbs ?? [
                    { label: 'Dashboard', href: '/' },
                    ...(isEdit
                        ? [{ label: 'Profile', href: '/profile' }, { label: 'Edit' }]
                        : [{ label: 'Profile' }]
                    ),
                ]}
            />

            {/* ── Profile card shell ──────────────────────────────────── */}
            <Motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className={cx(cards.elevated, '!p-0 overflow-hidden border theme-border')}
            >
                {/* Banner */}
                <div className="relative h-44 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 group">
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {/* Floating Edit/Action Trigger */}
                    <div className="absolute top-6 right-6 z-20">
                        {actions}
                    </div>

                    <div className="absolute -bottom-14 left-8 flex items-end gap-5">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full border-4 border-white dark:border-[var(--qb-surface)] bg-gray-100 dark:bg-gray-800 overflow-hidden shadow-lg">
                                {avatarSrc ? (
                                    <img src={avatarSrc} alt={name || 'Profile'} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[var(--qb-primary)] bg-[var(--qb-primary)]/10">
                                        <User size={40} />
                                    </div>
                                )}
                            </div>
                            {isPro && !verified && (
                                <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-amber-400 border-2 border-white dark:border-[var(--qb-surface)] flex items-center justify-center shadow">
                                    <Sparkles size={12} className="text-white" fill="currentColor" />
                                </div>
                            )}
                            {verified && (
                                <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-500 border-2 border-white dark:border-[var(--qb-surface)] flex items-center justify-center shadow" title="Verified Creator">
                                    <CheckCircle size={16} className="text-white" strokeWidth={3} />
                                </div>
                            )}
                        </div>

                        {/* Identity labels — visible on desktop only */}
                        <div className="hidden md:block pb-2 space-y-0.5">
                            <div className="flex items-center gap-2">
                                <h2 className={typography.h2}>{name || 'Your Name'}</h2>
                                {isPro && (
                                    <span className={cx(
                                        'text-xs font-medium px-2.5 py-0.5 rounded-full',
                                        theme.colors.badgeBg,
                                        theme.colors.badgeText,
                                    )}>
                                        {theme.label}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={cx(typography.small, 'flex items-center gap-1')}><Mail size={11} />{email}</span>
                                {mobileNumber && (
                                    <>
                                        <span className="w-px h-3 bg-white/30" />
                                        <span className={cx(typography.small, 'flex items-center gap-1')}><Phone size={11} />{mobileNumber}</span>
                                    </>
                                )}
                                <span className="w-px h-3 bg-white/30" />
                                <span className={cx(typography.small, 'flex items-center gap-1 capitalize')}><ShieldCheck size={11} />{role}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main content area */}
                <div className="pt-20 px-6 md:px-10 pb-10">
                    {/* Mobile identity (visible only on small screens) */}
                    <div className="md:hidden mb-4 space-y-0.5">
                        <div className="flex items-center gap-2">
                            <h2 className={typography.h2}>{name || 'Your Name'}</h2>
                            {isPro && (
                                <span className={cx(
                                    'text-xs font-medium px-2.5 py-0.5 rounded-full',
                                    theme.colors.badgeBg,
                                    theme.colors.badgeText,
                                )}>
                                    {theme.label}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <span className={cx(typography.small, 'flex items-center gap-1')}><Mail size={11} />{email}</span>
                            {mobileNumber && (
                                <span className={cx(typography.small, 'flex items-center gap-1')}><Phone size={11} />{mobileNumber}</span>
                            )}
                        </div>
                    </div>

                    <div className="w-full">
                        <Motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                        >
                            {children}
                        </Motion.div>
                    </div>
                </div>
            </Motion.div>
        </div>
    );
};

export default ProfileTemplate;
