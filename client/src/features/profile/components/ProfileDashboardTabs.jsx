import { motion as Motion } from 'framer-motion';

import { PROFILE_FIELDS } from '../config/profileFields.config';
import { getProfileType } from '../utils/getProfileType';
import { Activity, Star } from 'lucide-react';
import { cards, typography, layout, cx } from '../../../styles/index';

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, caption, highlight, index }) => (
    <Motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={cx(
            cards.metric,
            'transition-colors',
            highlight
                ? 'border-[var(--qb-primary)]/30 bg-[var(--qb-primary)]/5'
                : 'hover:border-[var(--qb-primary)]/20',
        )}
    >
        <div className={cx(layout.rowBetween, 'mb-1')}>
            <p className={typography.metaLabel}>{label}</p>
            {highlight && <Star size={12} className="text-[var(--qb-primary)]" fill="currentColor" />}
        </div>
        <p className={cx(typography.bodyStrong, 'theme-text-primary')}>
            {value || <span className="theme-text-muted italic font-normal text-sm">Not set</span>}
        </p>
        {caption && <p className={cx(typography.micro, 'mt-1')}>{caption}</p>}
    </Motion.div>
);

// ── Section heading ────────────────────────────────────────────────────────────
const SectionHeading = ({ title, subtitle }) => (
    <div className="space-y-0.5 mb-4">
        <h3 className={typography.h3}>{title}</h3>
        {subtitle && <p className={typography.body}>{subtitle}</p>}
    </div>
);

// ── Main component ─────────────────────────────────────────────────────────────
const ProfileDashboardTabs = ({ user }) => {
    const type   = getProfileType(user);
    const fields = PROFILE_FIELDS[type];

    const getValue = (key) => {
        if (user[key])                          return user[key];
        if (user.participantProfile?.[key])      return user.participantProfile[key];
        if (user.hostProfile?.[key])             return user.hostProfile[key];
        return null;
    };

    return (
        <div className={layout.section}>
            {/* ── Field overview ─────────────────────────────────────── */}
            <section>
                <SectionHeading
                    title={user?.role === 'participant' ? 'My Details' : `${type} Profile`}
                    subtitle={
                        user?.role === 'participant'
                            ? 'Your participant information and preferences.'
                            : `Account details for your ${user?.subscription?.plan || user?.plan || 'Free'} plan.`
                    }
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {fields.map((f, i) => (
                        <StatCard
                            key={f.key}
                            index={i}
                            label={f.label}
                            value={getValue(f.key)}
                            highlight={f.highlight}
                        />
                    ))}
                </div>
            </section>

            {/* ── Status banner ──────────────────────────────────────── */}
            <section className="pt-4 border-t theme-border">
                <div className={cx(cards.subtle, layout.rowBetween, 'flex-wrap gap-3')}>
                    <div className={layout.rowStart}>
                        <div className="w-8 h-8 rounded-lg bg-[var(--qb-primary)] text-white flex items-center justify-center">
                            <Activity size={16} />
                        </div>
                        <div>
                            <p className={typography.bodyStrong}>Account Status</p>
                            <p className={typography.small}>All profile data is up to date.</p>
                        </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                        Active
                    </span>
                </div>
            </section>
        </div>
    );
};

export default ProfileDashboardTabs;
