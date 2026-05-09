import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Activity, Star } from 'lucide-react';
import { getProfileType } from '../utils/getProfileType';
import { cards, typography, layout, cx } from '../../../styles/index';

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
        <p className={cx(typography.bodyStrong, 'theme-text-primary truncate')}>
            {value || <span className="theme-text-muted italic font-normal text-sm">Not set</span>}
        </p>
        {caption && <p className={cx(typography.micro, 'mt-1')}>{caption}</p>}
    </Motion.div>
);

const SectionHeading = ({ title, subtitle }) => (
    <div className="space-y-0.5 mb-4 mt-8 first:mt-0">
        <h3 className={typography.h3}>{title}</h3>
        {subtitle && <p className={typography.body}>{subtitle}</p>}
    </div>
);

const FreeDashboard = ({ user }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <StatCard index={0} label="Full Name" value={user.name} />
        <StatCard index={1} label="Display Name" value={user.profile?.displayName} />
        <StatCard index={2} label="Role" value={user.profile?.role} />
        <StatCard index={3} label="Subjects" value={user.profile?.subjects?.join(', ')} />
    </div>
);

const GlobalSettingsDashboard = ({ user }) => (
    <>
        <SectionHeading title="Global Settings" subtitle="Preferences that apply across your entire account." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard index={0} label="Language" value={user.profile?.language} />
            <StatCard index={1} label="Timezone" value={user.profile?.timezone} />
            <StatCard index={2} label="Email Notifications" value={user.profile?.emailPreferences === false ? 'Disabled' : 'Enabled'} />
        </div>
    </>
);

const CreatorDashboard = ({ user }) => (
    <>
        <SectionHeading title="Identity" subtitle="Your basic profile identity." />
        <FreeDashboard user={user} />

        <SectionHeading title="Creator Brand" subtitle="Premium creator settings and monetization." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <StatCard index={0} label="Brand Name" value={user.creator?.brandName} highlight />
            <StatCard index={1} label="Tagline" value={user.creator?.tagline} highlight />
            <StatCard index={2} label="Website" value={user.creator?.website} highlight />
            <StatCard index={3} label="Certifications" value={user.creator?.certifications} highlight />
            <StatCard index={4} label="Hiring Domain" value={user.creator?.hiringDomain} highlight />
        </div>
    </>
);

const TeamsDashboard = ({ user }) => (
    <>
        <SectionHeading title="Organization" subtitle="Primary organization details." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <StatCard index={0} label="Organization Name" value={user.organization?.name} highlight />
            <StatCard index={1} label="Type" value={user.organization?.type} highlight />
            <StatCard index={2} label="Verified Domain" value={user.organization?.domain} highlight />
            <StatCard index={3} label="Website" value={user.organization?.website} highlight />
            <StatCard index={4} label="GST / Tax ID" value={user.organization?.taxId} highlight />
        </div>

        <SectionHeading title="Academic / Industry" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <StatCard index={0} label="Departments" value={user.organization?.departments || user.organization?.academic?.department} highlight />
            <StatCard index={1} label="Affiliation" value={user.organization?.academic?.affiliation} highlight />
        </div>

        <SectionHeading title="Contact" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <StatCard index={0} label="Email" value={user.organization?.contact?.email} highlight />
            <StatCard index={1} label="Phone" value={user.organization?.contact?.phone} highlight />
        </div>
    </>
);

const ProfileDashboardTabs = ({ user }) => {
    const type = getProfileType(user);

    return (
        <div className={layout.section}>
            <section>
                <GlobalSettingsDashboard user={user} />
                
                {type === 'FREE' && (
                    <>
                        <SectionHeading title="Identity" subtitle="Your basic profile identity." />
                        <FreeDashboard user={user} />
                    </>
                )}
                {type === 'CREATOR' && <CreatorDashboard user={user} />}
                {type === 'TEAMS' && <TeamsDashboard user={user} />}
            </section>
        </div>
    );
};

export default ProfileDashboardTabs;
