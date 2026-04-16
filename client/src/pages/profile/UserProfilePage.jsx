import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { updateProfile as updateProfileService } from '../../services/authService';
import { getMyProfile } from '../../services/api';
import Button from '../../components/ui/Button';
import ProfileDashboardTabs from '../../components/profile/ProfileDashboardTabs';
import ProfileTemplate from '../../components/profile/ProfileTemplate';
import Toast from '../../components/common/Toast';
import useToast from '../../hooks/useToast';
import { cx } from '../../styles/theme';
import { components } from '../../styles/components';
import { useQuizStore } from '../../stores/useQuizStore';

const UserProfilePage = ({ initialMode = 'view' }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = useAuthStore((state) => state.user);
    const setAuthData = useAuthStore((state) => state.setAuthData);
    const setProfileCached = useQuizStore((state) => state.setProfileCached);
    const { toast, showToast, clearToast } = useToast();

    const isHost = user?.role === 'organizer' || user?.role === 'admin';
    const [name, setName] = useState(user?.name || '');
    const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || '');
    const [participantPhone, setParticipantPhone] = useState(user?.participantProfile?.phone || '');
    const [participantCity, setParticipantCity] = useState(user?.participantProfile?.city || '');
    const [participantBio, setParticipantBio] = useState(user?.participantProfile?.bio || '');
    const [institutionName, setInstitutionName] = useState(user?.hostProfile?.institutionName || '');
    const [institutionType, setInstitutionType] = useState(user?.hostProfile?.institutionType || '');
    const [institutionWebsite, setInstitutionWebsite] = useState(user?.hostProfile?.institutionWebsite || '');
    const [institutionAddress, setInstitutionAddress] = useState(user?.hostProfile?.institutionAddress || '');
    const [contactEmail, setContactEmail] = useState(user?.hostProfile?.contactEmail || '');
    const [contactPhone, setContactPhone] = useState(user?.hostProfile?.contactPhone || '');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});

    const hydrateProfile = useCallback(async () => {
        try {
            const profile = await getMyProfile();
            setName(profile?.name || '');
            setProfilePhoto(profile?.profilePhoto || '');
            setParticipantPhone(profile?.participantProfile?.phone || '');
            setParticipantCity(profile?.participantProfile?.city || '');
            setParticipantBio(profile?.participantProfile?.bio || '');
            setInstitutionName(profile?.hostProfile?.institutionName || '');
            setInstitutionType(profile?.hostProfile?.institutionType || '');
            setInstitutionWebsite(profile?.hostProfile?.institutionWebsite || '');
            setInstitutionAddress(profile?.hostProfile?.institutionAddress || '');
            setContactEmail(profile?.hostProfile?.contactEmail || '');
            setContactPhone(profile?.hostProfile?.contactPhone || '');
        } catch {
            setName(user?.name || '');
            setProfilePhoto(user?.profilePhoto || '');
            setParticipantPhone(user?.participantProfile?.phone || '');
            setParticipantCity(user?.participantProfile?.city || '');
            setParticipantBio(user?.participantProfile?.bio || '');
            setInstitutionName(user?.hostProfile?.institutionName || '');
            setInstitutionType(user?.hostProfile?.institutionType || '');
            setInstitutionWebsite(user?.hostProfile?.institutionWebsite || '');
            setInstitutionAddress(user?.hostProfile?.institutionAddress || '');
            setContactEmail(user?.hostProfile?.contactEmail || '');
            setContactPhone(user?.hostProfile?.contactPhone || '');
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
    const edit = components.profileEdit;

    const labelClass = edit.label;
    const inputClass = edit.input;
    const readonlyInputClass = edit.inputReadonly;

    const validateForm = () => {
        const nextErrors = {};

        if (!name.trim()) {
            nextErrors.name = 'Display name is required.';
        }

        if (profilePhoto.trim() && !/^https?:\/\/.+/i.test(profilePhoto.trim())) {
            nextErrors.profilePhoto = 'Profile image must be a valid URL.';
        }

        if (isHost) {
            if (institutionWebsite.trim() && !/^https?:\/\/.+/i.test(institutionWebsite.trim())) {
                nextErrors.institutionWebsite = 'Website must start with http:// or https://';
            }
            if (contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
                nextErrors.contactEmail = 'Contact email is invalid.';
            }
        }

        const phoneValue = isHost ? contactPhone.trim() : participantPhone.trim();
        if (phoneValue && phoneValue.length < 8) {
            nextErrors.contactPhone = 'Contact number looks too short.';
        }

        return nextErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setFieldErrors({});

        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length > 0) {
            setFieldErrors(validationErrors);
            setError('Please fix the highlighted fields.');
            return;
        }

        const payload = {
            name: name.trim(),
            profilePhoto: profilePhoto.trim(),
            ...(isHost
                ? {
                    hostProfile: {
                        institutionName: institutionName.trim(),
                        institutionType: institutionType.trim(),
                        institutionWebsite: institutionWebsite.trim(),
                        institutionAddress: institutionAddress.trim(),
                        contactEmail: contactEmail.trim(),
                        contactPhone: contactPhone.trim(),
                    },
                }
                : {
                    participantProfile: {
                        phone: participantPhone.trim(),
                        city: participantCity.trim(),
                        bio: participantBio.trim(),
                    },
                }),
        };

        setSaving(true);
        try {
            const data = await updateProfileService(payload);
            setAuthData(data);
            setProfileCached(data);
            showToast('Profile updated successfully.', 'success');
            navigate('/profile');
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    const isEditing = location.pathname.endsWith('/edit') || initialMode === 'edit';
    const profileActions = (
        <div className={components.profile.actionRow}>
            {isEditing ? (
                <Button type="submit" form="profile-edit-form" variant="secondary" size="md">
                    Save
                </Button>
            ) : (
                <Button type="button" variant="secondary" size="md" onClick={() => navigate('/profile/edit')}>
                    Edit
                </Button>
            )}
        </div>
    );

    if (loading) {
        return (
            <div className={components.profile.loadingPage}>
                <div className={components.analytics.cardCompact}>
                    <p className={components.profile.loadingText}>Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <ProfileTemplate
            title={isEditing ? 'Edit Profile' : 'Profile'}
            subtitle={isEditing ? 'Update your organization details' : 'Manage your account identity, role access, and performance overview.'}
            breadcrumbs={isEditing
                ? [{ label: 'Dashboard', href: dashboardHref }, { label: 'Profile', href: '/profile' }, { label: 'Edit' }]
                : [{ label: 'Dashboard', href: dashboardHref }, { label: 'Profile' }]}
            actions={profileActions}
            avatarSrc={profilePhoto}
            avatarFallback={initials}
            name={name || 'User'}
            role={user?.role}
            plan={user?.plan || 'FREE'}
            email={user?.email || 'No email available'}
        >
            {isEditing ? (
                <>
                    <Toast message={toast?.message} type={toast?.type} onClose={clearToast} />

                    <form id="profile-edit-form" onSubmit={handleSubmit} className={edit.form}>
                        <section className={edit.section}>
                            <h2 className={edit.sectionTitle}>Basic Info</h2>

                            <div className={edit.grid}>
                                <div className={edit.field}>
                                    <label className={labelClass} htmlFor="display-name">Display Name</label>
                                    <input
                                        id="display-name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className={cx(inputClass, fieldErrors.name && edit.inputError)}
                                        placeholder={isHost ? 'Institution admin name' : 'Your name'}
                                    />
                                    {fieldErrors.name && <p className={edit.errorText}>{fieldErrors.name}</p>}
                                </div>

                                <div className={edit.field}>
                                    <label className={labelClass} htmlFor="profile-photo">{isHost ? 'Institution Logo URL' : 'Profile Image URL'}</label>
                                    <input
                                        id="profile-photo"
                                        value={profilePhoto}
                                        onChange={(e) => setProfilePhoto(e.target.value)}
                                        className={cx(inputClass, fieldErrors.profilePhoto && edit.inputError)}
                                        placeholder="https://example.com/image.jpg"
                                    />
                                    {fieldErrors.profilePhoto && <p className={edit.errorText}>{fieldErrors.profilePhoto}</p>}
                                </div>

                                <div className={edit.fieldWide}>
                                    <label className={labelClass} htmlFor="account-email">Email</label>
                                    <input id="account-email" value={user?.email || ''} disabled readOnly className={cx(inputClass, readonlyInputClass)} />
                                </div>
                            </div>
                        </section>

                        <section className={cx(edit.section, edit.sectionDivider)}>
                            <h2 className={edit.sectionTitle}>Institution Details</h2>

                            {isHost ? (
                                <div className={edit.grid}>
                                    <div className={edit.field}>
                                        <label className={labelClass} htmlFor="institution-name">Institution Name</label>
                                        <input id="institution-name" value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} className={inputClass} placeholder="QuizBolt Academy" />
                                    </div>
                                    <div className={edit.field}>
                                        <label className={labelClass} htmlFor="institution-type">Institution Type</label>
                                        <input id="institution-type" value={institutionType} onChange={(e) => setInstitutionType(e.target.value)} className={inputClass} placeholder="School, Coaching, Enterprise" />
                                    </div>
                                    <div className={edit.fieldWide}>
                                        <label className={labelClass} htmlFor="institution-website">Website</label>
                                        <input
                                            id="institution-website"
                                            value={institutionWebsite}
                                            onChange={(e) => setInstitutionWebsite(e.target.value)}
                                            className={cx(inputClass, fieldErrors.institutionWebsite && edit.inputError)}
                                            placeholder="https://institution.com"
                                        />
                                        {fieldErrors.institutionWebsite && <p className={edit.errorText}>{fieldErrors.institutionWebsite}</p>}
                                    </div>
                                    <div className={edit.fieldWide}>
                                        <label className={labelClass} htmlFor="institution-address">Institution Address</label>
                                        <input id="institution-address" value={institutionAddress} onChange={(e) => setInstitutionAddress(e.target.value)} className={inputClass} placeholder="City, State, Country" />
                                    </div>
                                </div>
                            ) : (
                                <div className={edit.grid}>
                                    <div className={edit.field}>
                                        <label className={labelClass} htmlFor="participant-city">City</label>
                                        <input id="participant-city" value={participantCity} onChange={(e) => setParticipantCity(e.target.value)} className={inputClass} placeholder="Hyderabad" />
                                    </div>
                                    <div className={edit.fieldWide}>
                                        <label className={labelClass} htmlFor="participant-bio">Bio</label>
                                        <textarea id="participant-bio" value={participantBio} onChange={(e) => setParticipantBio(e.target.value)} rows={4} className={inputClass} placeholder="Tell us something about you" />
                                    </div>
                                </div>
                            )}
                        </section>

                        <section className={cx(edit.section, edit.sectionDivider)}>
                            <h2 className={edit.sectionTitle}>Contact Info</h2>

                            <div className={edit.grid}>
                                {isHost && (
                                    <div className={edit.field}>
                                        <label className={labelClass} htmlFor="contact-email">Contact Email</label>
                                        <input
                                            id="contact-email"
                                            value={contactEmail}
                                            onChange={(e) => setContactEmail(e.target.value)}
                                            className={cx(inputClass, fieldErrors.contactEmail && edit.inputError)}
                                            placeholder="contact@institution.com"
                                        />
                                        {fieldErrors.contactEmail && <p className={edit.errorText}>{fieldErrors.contactEmail}</p>}
                                    </div>
                                )}

                                <div className={edit.field}>
                                    <label className={labelClass} htmlFor="contact-phone">Contact Phone</label>
                                    <input
                                        id="contact-phone"
                                        value={isHost ? contactPhone : participantPhone}
                                        onChange={(e) => (isHost ? setContactPhone(e.target.value) : setParticipantPhone(e.target.value))}
                                        className={cx(inputClass, fieldErrors.contactPhone && edit.inputError)}
                                        placeholder="+91 98765 43210"
                                    />
                                    {fieldErrors.contactPhone && <p className={edit.errorText}>{fieldErrors.contactPhone}</p>}
                                </div>
                            </div>
                        </section>

                        {error && <p className={edit.errorText}>{error}</p>}

                        <div className={edit.footer}>
                            <Button type="submit" variant="primary" size="md" disabled={saving}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </>
            ) : (
                <ProfileDashboardTabs
                    isHost={isHost}
                    user={user}
                />
            )}
        </ProfileTemplate>
    );
};

export default UserProfilePage;

