import { components } from '../../../styles/components';
import { PROFILE_FIELDS } from '../config/profileFields.config';
import { getProfileType } from '../utils/getProfileType';

const StatCard = ({ label, value, caption, highlight }) => (
    <div className={`${components.profile.statCard} ${highlight ? 'border-[var(--qb-primary)] bg-[var(--qb-primary-alpha)]' : ''}`}>
        <p className={components.profile.statLabel}>{label}</p>
        <p className={components.profile.statValue}>{value || 'Not set'}</p>
        {caption && <p className={components.profile.sectionSubText}>{caption}</p>}
    </div>
);

const SectionHeading = ({ title, subtitle }) => (
    <div className={components.profile.sectionHeading}>
        <h3 className="text-lg font-bold theme-text-primary">{title}</h3>
        {subtitle && <p className={components.profile.sectionSubText}>{subtitle}</p>}
    </div>
);

const ProfileDashboardTabs = ({ user }) => {
    const type = getProfileType(user);
    const fields = PROFILE_FIELDS[type];

    // Helper to get nested value
    const getValue = (key) => {
        if (user[key]) return user[key];
        if (user.participantProfile?.[key]) return user.participantProfile[key];
        if (user.hostProfile?.[key]) return user.hostProfile[key];
        return null;
    };

    return (
        <div className={components.profile.sectionStack}>
            <div className="flex items-center justify-between mb-2">
                <SectionHeading 
                    title={user?.role === 'participant' ? 'Your Profile Details' : `${type} Profile Details`} 
                    subtitle={user?.role === 'participant' ? 'View and manage your participant identity.' : `Information visible based on your ${user?.subscription?.plan || user?.plan || 'Free'} plan.`} 
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map((f) => (
                    <StatCard 
                        key={f.key}
                        label={f.label}
                        value={getValue(f.key)}
                        highlight={f.highlight}
                    />
                ))}
            </div>
        </div>
    );
};

export default ProfileDashboardTabs;
