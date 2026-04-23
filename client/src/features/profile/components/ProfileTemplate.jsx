import { motion as Motion } from 'framer-motion';
import SubHeader from '../../../components/layout/SubHeader';
import { useSubscriptionTheme } from '../../../hooks/useSubscriptionTheme';

import { User, ShieldCheck, Mail, Sparkles } from 'lucide-react';
import { cx, layout, typography, cards } from '../../../styles/index';

const ProfileTemplate = ({
    title,
    subtitle,
    breadcrumbs,
    actions,
    avatarSrc,
    name,
    email,
    plan,
    role,
    children,
}) => {
    const { theme, isPro } = useSubscriptionTheme();

    const isEdit = title?.toLowerCase().includes('edit');

    return (
        <div className={cx(layout.page, 'min-h-screen pb-16')}>
            {/* ── SubHeader with breadcrumbs ──────────────────────────── */}
            <SubHeader
                title={isEdit ? 'Edit Profile' : 'Profile'}
                subtitle={isEdit ? 'Update your account details.' : 'Manage your identity and account preferences.'}
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
                <div className="relative h-36 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="absolute -bottom-12 left-8 flex items-end gap-4">
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
                            {isPro && (
                                <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-amber-400 border-2 border-white dark:border-[var(--qb-surface)] flex items-center justify-center shadow">
                                    <Sparkles size={12} className="text-white" fill="currentColor" />
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
                                <span className="w-px h-3 bg-white/30" />
                                <span className={cx(typography.small, 'flex items-center gap-1 capitalize')}><ShieldCheck size={11} />{role}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main content */}
                <div className="pt-16 px-6 md:px-8 pb-8">
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
                        <div className="flex items-center gap-3">
                            <span className={cx(typography.small, 'flex items-center gap-1')}><Mail size={11} />{email}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Sidebar actions */}
                        <div className="lg:col-span-3">
                            <div className={cx(cards.subtle, 'space-y-3')}>
                                <p className={typography.eyebrow}>Account Actions</p>
                                {actions}
                            </div>
                        </div>

                        {/* Content area */}
                        <div className="lg:col-span-9">
                            <Motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.1 }}
                            >
                                {children}
                            </Motion.div>
                        </div>
                    </div>
                </div>
            </Motion.div>
        </div>
    );
};

export default ProfileTemplate;
