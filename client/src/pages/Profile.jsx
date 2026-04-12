import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { getMyProfile } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ProfileDashboardTabs from '../components/profile/ProfileDashboardTabs';
import SubHeader from '../components/layout/SubHeader';
import { Pencil } from 'lucide-react';
import { components } from '../styles/components';
import { cx } from '../styles/theme';

const Profile = () => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);

    const isHost = user?.role === 'organizer' || user?.role === 'admin';

    const [name, setName] = useState(user?.name || '');
    const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || '');
    const [loading, setLoading] = useState(true);

    const hydrateProfile = useCallback(async () => {
        try {
            const profile = await getMyProfile();
            setName(profile?.name || '');
            setProfilePhoto(profile?.profilePhoto || '');
        } catch {
            setName(user?.name || '');
            setProfilePhoto(user?.profilePhoto || '');
        }
    }, [user]);

    useEffect(() => {
        let mounted = true;
        const bootstrap = async () => {
            try {
                await hydrateProfile();
            } finally {
                if (mounted) setLoading(false);
            }
        };

        bootstrap();

        return () => {
            mounted = false;
        };
    }, [hydrateProfile]);

    const initials = useMemo(() => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
    }, [name]);

    const dashboardHref = isHost ? '/studio' : '/join';
    const profileActions = (
        <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => navigate('/profile/edit')}
        >
            <Pencil size={16} aria-hidden="true" />
            Edit
        </Button>
    );

    if (loading) {
        return (
            <div className={components.profile.loadingPage}>
                <Card className={components.analytics.cardCompact}>
                    <p className={components.profile.loadingText}>Loading profile...</p>
                </Card>
            </div>
        );
    }

    return (
        <div className={components.profile.page}>
            <SubHeader
                title="Profile"
                subtitle="Manage your account identity, role access, and performance overview."
                breadcrumbs={[{ label: 'Dashboard', href: dashboardHref }, { label: 'Profile' }]}
                actions={profileActions}
            />

            <Card className={components.profile.cardStack}>
                <div className={components.profile.rowBetween}>
                    <div className={components.profile.identityWrap}>
                    <div className={components.profile.avatar}>
                        {profilePhoto ? (
                            <img src={profilePhoto} alt="Profile" className={components.profile.avatarImage} />
                        ) : (
                            <span>{initials}</span>
                        )}
                    </div>
                    <div>
                        <h1 className={components.profile.titleRow}>
                            {name || 'User'}
                            <span className={components.profile.roleBadge}>
                                {user?.role}
                            </span>
                            <span className={cx(
                                components.profile.planBadgeBase,
                                user.plan === 'FREE' || !user.plan
                                    ? components.profile.planFree
                                    : user.plan === 'PREMIUM'
                                        ? components.profile.planPremium
                                        : components.profile.planPro,
                            )}>
                                {user?.plan || 'FREE'}
                            </span>
                        </h1>
                        <p className={components.profile.email}>{user?.email || 'No email available'}</p>
                    </div>
                    </div>
                </div>

                <ProfileDashboardTabs
                    isHost={isHost}
                    user={user}
                />
            </Card>
        </div>
    );
};

export default Profile;
