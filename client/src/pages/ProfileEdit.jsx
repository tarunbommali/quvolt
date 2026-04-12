import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import SubHeader from '../components/layout/SubHeader';
import Toast from '../components/common/Toast';
import useToast from '../hooks/useToast';
import { useAuthStore } from '../stores/useAuthStore';
import { useQuizStore } from '../stores/useQuizStore';

const ProfileEdit = () => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const updateProfile = useAuthStore((state) => state.updateProfile);
    const setProfileCached = useQuizStore((state) => state.setProfileCached);
    const { toast, showToast, clearToast } = useToast();

    const isHost = user?.role === 'organizer' || user?.role === 'admin';
    const dashboardHref = isHost ? '/studio' : '/join';

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
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});

    const initials = useMemo(() => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
    }, [name]);

    const labelClass = 'text-xs uppercase tracking-wide text-gray-400';
    const inputClass = 'w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500';
    const readonlyInputClass = `${inputClass} bg-gray-50 text-gray-500`;

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
            const updated = await updateProfile(payload);
            setProfileCached(updated);
            showToast('Profile updated successfully.', 'success');
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="app-page space-y-4">
            <Toast message={toast?.message} type={toast?.type} onClose={clearToast} />

            <SubHeader
                title="Edit Profile"
                subtitle="Update your organization details"
                breadcrumbs={[
                    { label: 'Dashboard', href: dashboardHref },
                    { label: 'Profile', href: '/profile' },
                    { label: 'Edit' },
                ]}
            />

            <Card className="mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <section className="space-y-4">
                        <h2 className="text-xs uppercase tracking-wide text-gray-400">Basic Info</h2>

                        <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
                            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-indigo-50 text-sm font-medium text-indigo-600">
                                {profilePhoto ? (
                                    <img src={profilePhoto} alt={isHost ? 'Institution logo' : 'Profile'} className="h-full w-full object-cover" />
                                ) : (
                                    <span>{initials}</span>
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">Avatar Preview</p>
                                <p className="text-sm text-gray-600">Paste an image URL below to update preview.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="flex flex-col gap-2">
                                <label className={labelClass} htmlFor="display-name">Display Name</label>
                                <input
                                    id="display-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={`${inputClass} ${fieldErrors.name ? 'border-red-300 focus:ring-red-400' : ''}`}
                                    placeholder={isHost ? 'Institution admin name' : 'Your name'}
                                />
                                {fieldErrors.name && <p className="text-xs font-medium text-red-600">{fieldErrors.name}</p>}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className={labelClass} htmlFor="profile-photo">{isHost ? 'Institution Logo URL' : 'Profile Image URL'}</label>
                                <input
                                    id="profile-photo"
                                    value={profilePhoto}
                                    onChange={(e) => setProfilePhoto(e.target.value)}
                                    className={`${inputClass} ${fieldErrors.profilePhoto ? 'border-red-300 focus:ring-red-400' : ''}`}
                                    placeholder="https://example.com/image.jpg"
                                />
                                {fieldErrors.profilePhoto && <p className="text-xs font-medium text-red-600">{fieldErrors.profilePhoto}</p>}
                            </div>

                            <div className="flex flex-col gap-2 md:col-span-2">
                                <label className={labelClass} htmlFor="account-email">Email</label>
                                <input id="account-email" value={user?.email || ''} disabled readOnly className={readonlyInputClass} />
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4 border-t border-gray-100 pt-4">
                        <h2 className="text-xs uppercase tracking-wide text-gray-400">Institution Details</h2>

                        {isHost ? (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="flex flex-col gap-2">
                                    <label className={labelClass} htmlFor="institution-name">Institution Name</label>
                                    <input id="institution-name" value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} className={inputClass} placeholder="QuizBolt Academy" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className={labelClass} htmlFor="institution-type">Institution Type</label>
                                    <input id="institution-type" value={institutionType} onChange={(e) => setInstitutionType(e.target.value)} className={inputClass} placeholder="School, Coaching, Enterprise" />
                                </div>
                                <div className="flex flex-col gap-2 md:col-span-2">
                                    <label className={labelClass} htmlFor="institution-website">Website</label>
                                    <input
                                        id="institution-website"
                                        value={institutionWebsite}
                                        onChange={(e) => setInstitutionWebsite(e.target.value)}
                                        className={`${inputClass} ${fieldErrors.institutionWebsite ? 'border-red-300 focus:ring-red-400' : ''}`}
                                        placeholder="https://institution.com"
                                    />
                                    {fieldErrors.institutionWebsite && <p className="text-xs font-medium text-red-600">{fieldErrors.institutionWebsite}</p>}
                                </div>
                                <div className="flex flex-col gap-2 md:col-span-2">
                                    <label className={labelClass} htmlFor="institution-address">Institution Address</label>
                                    <input id="institution-address" value={institutionAddress} onChange={(e) => setInstitutionAddress(e.target.value)} className={inputClass} placeholder="City, State, Country" />
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="flex flex-col gap-2">
                                    <label className={labelClass} htmlFor="participant-city">City</label>
                                    <input id="participant-city" value={participantCity} onChange={(e) => setParticipantCity(e.target.value)} className={inputClass} placeholder="Hyderabad" />
                                </div>
                                <div className="flex flex-col gap-2 md:col-span-2">
                                    <label className={labelClass} htmlFor="participant-bio">Bio</label>
                                    <textarea id="participant-bio" value={participantBio} onChange={(e) => setParticipantBio(e.target.value)} rows={4} className={inputClass} placeholder="Tell us something about you" />
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="space-y-4 border-t border-gray-100 pt-4">
                        <h2 className="text-xs uppercase tracking-wide text-gray-400">Contact Info</h2>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {isHost && (
                                <div className="flex flex-col gap-2">
                                    <label className={labelClass} htmlFor="contact-email">Contact Email</label>
                                    <input
                                        id="contact-email"
                                        value={contactEmail}
                                        onChange={(e) => setContactEmail(e.target.value)}
                                        className={`${inputClass} ${fieldErrors.contactEmail ? 'border-red-300 focus:ring-red-400' : ''}`}
                                        placeholder="contact@institution.com"
                                    />
                                    {fieldErrors.contactEmail && <p className="text-xs font-medium text-red-600">{fieldErrors.contactEmail}</p>}
                                </div>
                            )}

                            <div className="flex flex-col gap-2">
                                <label className={labelClass} htmlFor="contact-phone">Contact Phone</label>
                                <input
                                    id="contact-phone"
                                    value={isHost ? contactPhone : participantPhone}
                                    onChange={(e) => (isHost ? setContactPhone(e.target.value) : setParticipantPhone(e.target.value))}
                                    className={`${inputClass} ${fieldErrors.contactPhone ? 'border-red-300 focus:ring-red-400' : ''}`}
                                    placeholder="+91 98765 43210"
                                />
                                {fieldErrors.contactPhone && <p className="text-xs font-medium text-red-600">{fieldErrors.contactPhone}</p>}
                            </div>
                        </div>
                    </section>

                    {error && <p className="text-sm font-medium text-red-600">{error}</p>}

                    <div className="sticky bottom-0 z-20 -mx-4 mt-4 flex items-center justify-between gap-3 border-t border-gray-100 bg-white/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-t-0 md:bg-transparent md:px-0 md:py-0">
                        <Button type="submit" variant="primary" size="md" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button type="button" variant="secondary" size="md" onClick={() => navigate('/profile')}>
                            Back to Profile
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default ProfileEdit;
