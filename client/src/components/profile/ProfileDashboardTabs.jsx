import { components } from '../../styles/components';

const StatCard = ({ label, value, caption }) => (
    <div className={components.profile.statCard}>
        <p className={components.profile.statLabel}>{label}</p>
        <p className={components.profile.statValue}>{value}</p>
        {caption && <p className={components.profile.sectionSubText}>{caption}</p>}
    </div>
);

const SectionHeading = ({ title, subtitle }) => (
    <div className={components.profile.sectionHeading}>
        <h2 className={components.profile.statLabel}>{title}</h2>
        {subtitle && <p className={components.profile.sectionSubText}>{subtitle}</p>}
    </div>
);

const HostOverviewTab = ({ user }) => (
    <div className={components.profile.sectionStack}>
        <div className={components.profile.sectionStack}>
            <SectionHeading title="Institutional Details" subtitle="Saved institution profile information" />
            <div className={components.profile.statCard}>
                <div className={components.profile.statGrid}>
                    <StatCard label="Institution Name" value={user?.hostProfile?.institutionName || 'Not set'} />
                    <StatCard label="Institution Type" value={user?.hostProfile?.institutionType || 'Not set'} />
                    <StatCard label="Website" value={user?.hostProfile?.institutionWebsite || 'Not set'} />
                    <StatCard label="Address" value={user?.hostProfile?.institutionAddress || 'Not set'} />
                    <StatCard label="Contact Email" value={user?.hostProfile?.contactEmail || user?.email || 'Not set'} />
                    <StatCard label="Contact Phone" value={user?.hostProfile?.contactPhone || 'Not set'} />
                </div>
            </div>
        </div>
    </div>
);

const ParticipantOverviewTab = ({ user }) => (
    <div className={components.profile.sectionStack}>
        <div className={components.profile.statCard}>
            <p className={components.profile.statLabel}>Participant Access</p>
            <p className={components.profile.sectionSubText}>
                You are using Quvolt via a host account{user?.plan ? ` (${user.plan})` : ''}.
            </p>
        </div>

        <div className={components.profile.sectionStack}>
            <SectionHeading title="Participant Details" subtitle="Saved profile information" />
            <div className={components.profile.statCard}>
                <div className={components.profile.statGrid}>
                    <StatCard label="Phone" value={user?.participantProfile?.phone || 'Not set'} />
                    <StatCard label="City" value={user?.participantProfile?.city || 'Not set'} />
                    <StatCard label="Bio" value={user?.participantProfile?.bio || 'Not set'} />
                </div>
            </div>
        </div>
    </div>
);

const ProfileDashboardTabs = ({
    isHost,
    user,
}) => {
    return (
        <div className={components.profile.sectionStack}>
            {isHost ? (
                <HostOverviewTab user={user} />
            ) : (
                <ParticipantOverviewTab user={user} />
            )}
        </div>
    );
};

export default ProfileDashboardTabs;
