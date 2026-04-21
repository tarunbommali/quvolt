import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuthStore } from '../../../stores/useAuthStore';
import { useQuizStore } from '../../../stores/useQuizStore';

import { 
  updateMyProfile as updateProfile, 
  getMyProfile 
} from '../../auth/services/auth.service';

import { PROFILE_FIELDS } from '../config/profileFields.config';
import { getProfileType } from '../utils/getProfileType';

import ProfileTemplate from '../components/ProfileTemplate';
import ProfileDashboardTabs from '../components/ProfileDashboardTabs';
import Button from '../../../components/common/ui/Button';
import Toast from '../../../components/common/Toast';
import useToast from '../../../hooks/useToast';

const UserProfilePage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const user = useAuthStore((s) => s.user);
    const setAuthData = useAuthStore((s) => s.setAuthData);
    const setProfileCached = useQuizStore((state) => state.setProfileCached);

    const { toast, showToast, clearToast } = useToast();

    const [form, setForm] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const type = getProfileType(user);
    const fields = PROFILE_FIELDS[type];

    // hydrate
    useEffect(() => {
        const load = async () => {
            try {
                const data = await getMyProfile();
                const flattened = {
                    ...data,
                    ...(data.participantProfile || {}),
                    ...(data.hostProfile || {}),
                };
                setForm(flattened);
            } catch {
                const flattenedUser = {
                    ...user,
                    ...(user?.participantProfile || {}),
                    ...(user?.hostProfile || {}),
                };
                setForm(flattenedUser || {});
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user]);

    const handleChange = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const buildPayload = () => {
        return {
            name: form.name,
            profilePhoto: form.profilePhoto,
            ...(type === 'FREE' || type === 'CREATOR'
                ? {
                    participantProfile: {
                        city: form.city,
                        bio: form.bio,
                        contentCategory: form.contentCategory,
                        socialLinks: form.socialLinks,
                    },
                }
                : {
                    hostProfile: {
                        institutionName: form.institutionName,
                        institutionType: form.institutionType,
                        institutionWebsite: form.institutionWebsite,
                        institutionAddress: form.institutionAddress,
                        contactEmail: form.contactEmail,
                        contactPhone: form.contactPhone,
                    },
                }),
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const payload = buildPayload();
            const data = await updateProfile(payload);

            setAuthData(data);
            if (setProfileCached) setProfileCached(data);

            showToast('Profile updated', 'success');
            navigate('/profile');
        } catch {
            showToast('Update failed');
        } finally {
            setSaving(false);
        }
    };

    const isEditing = location.pathname.includes('/edit');

    if (loading) return <div>Loading...</div>;

    return (
        <ProfileTemplate
            title="Profile"
            name={form.name}
            email={user?.email}
            role={user?.role}
            plan={user?.subscription?.plan || user?.plan}
        >
            {isEditing ? (
                <div className="space-y-6">
                    {toast ? <Toast {...toast} onClose={clearToast} /> : null}

                    <div className="flex items-center justify-between mb-8 pb-4 border-b theme-border">
                        <div>
                            <h2 className="text-2xl font-bold theme-text-primary">Edit {type} Profile</h2>
                            <p className="text-sm theme-text-secondary mt-1">
                                Customize your identity and brand details for the Quvolt community.
                            </p>
                        </div>
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => navigate('/profile')}
                            className="h-10 px-4"
                        >
                            Cancel
                        </Button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {fields.map((f) => (
                                <div key={f.key} className={f.type === 'textarea' ? 'md:col-span-2' : ''}>
                                    <label className="block text-sm font-bold theme-text-primary mb-2 flex items-center gap-2">
                                        {f.label}
                                        {f.required && <span className="text-red-500">*</span>}
                                        {f.highlight && (
                                            <span className="px-2 py-0.5 rounded-full bg-[var(--qb-primary-alpha)] text-[var(--qb-primary)] text-[10px] uppercase tracking-wider">
                                                Premium
                                            </span>
                                        )}
                                    </label>

                                    {f.type === 'textarea' ? (
                                        <textarea
                                            value={form[f.key] || ''}
                                            onChange={(e) => handleChange(f.key, e.target.value)}
                                            rows={4}
                                            required={f.required}
                                            placeholder={`Enter your ${f.label.toLowerCase()}...`}
                                            className={`w-full px-5 py-3 rounded-2xl border theme-border theme-bg-secondary focus:ring-2 focus:ring-[var(--qb-primary)] outline-none transition-all resize-none shadow-xs ${f.highlight ? 'border-[var(--qb-primary)] ring-1 ring-[var(--qb-primary-alpha)]' : ''
                                                }`}
                                        />
                                    ) : (
                                        <input
                                            value={form[f.key] || ''}
                                            onChange={(e) => handleChange(f.key, e.target.value)}
                                            type={f.key === 'contactEmail' ? 'email' : 'text'}
                                            required={f.required}
                                            placeholder={`Enter ${f.label.toLowerCase()}...`}
                                            className={`w-full px-5 py-4 rounded-2xl border theme-border theme-bg-secondary focus:ring-2 focus:ring-[var(--qb-primary)] outline-none transition-all shadow-xs ${f.highlight ? 'border-[var(--qb-primary)] ring-1 ring-[var(--qb-primary-alpha)]' : ''
                                                }`}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="pt-6 flex items-center justify-end gap-4 border-t theme-border">
                            <Button 
                                variant="ghost" 
                                type="button" 
                                onClick={() => navigate('/profile')}
                                disabled={saving}
                            >
                                Discard
                            </Button>
                            <Button 
                                variant="primary" 
                                size="lg" 
                                disabled={saving}
                                className="px-12 py-4 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none"
                            >
                                {saving ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Saving...
                                    </span>
                                ) : 'Update Profile'}
                            </Button>
                        </div>
                    </form>
                </div>
            ) : (
                <ProfileDashboardTabs user={user} />
            )}
        </ProfileTemplate>
    );
};

export default UserProfilePage;
