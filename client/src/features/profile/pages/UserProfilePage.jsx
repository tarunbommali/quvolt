import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Save, Edit3 } from 'lucide-react';

import { useAuthStore } from '../../../stores/useAuthStore';
import { useQuizStore } from '../../../stores/useQuizStore';

import {
    updateMyProfile as updateProfile,
    getMyProfile,
} from '../../auth/services/auth.service';

import { PROFILE_FIELDS } from '../config/profileFields.config';
import { getProfileType } from '../utils/getProfileType';

import ProfileTemplate from '../components/ProfileTemplate';
import ProfileDashboardTabs from '../components/ProfileDashboardTabs';
import Toast from '../../../components/common/Toast';
import useToast from '../../../hooks/useToast';
import { typography, buttonStyles, cards, layout, cx } from '../../../styles/index';

const UserProfilePage = () => {
    const navigate  = useNavigate();
    const location  = useLocation();

    const user            = useAuthStore((s) => s.user);
    const setAuthData     = useAuthStore((s) => s.setAuthData);
    const setProfileCached = useQuizStore((s) => s.setProfileCached);

    const { toast, showToast, clearToast } = useToast();

    const [form,    setForm]    = useState({});
    const [loading, setLoading] = useState(true);
    const [saving,  setSaving]  = useState(false);

    const type   = getProfileType(user);
    const fields = PROFILE_FIELDS[type];

    // ── Hydrate form ─────────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const data = await getMyProfile();
                setForm({
                    ...data,
                    ...(data.participantProfile || {}),
                    ...(data.hostProfile       || {}),
                });
            } catch {
                setForm({
                    ...user,
                    ...(user?.participantProfile || {}),
                    ...(user?.hostProfile        || {}),
                });
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user]);

    const handleChange = (key, value) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const buildPayload = () => ({
        name:         form.name,
        profilePhoto: form.profilePhoto,
        ...(type === 'FREE' || type === 'CREATOR'
            ? {
                participantProfile: {
                    city:            form.city,
                    bio:             form.bio,
                    contentCategory: form.contentCategory,
                    socialLinks:     form.socialLinks,
                },
            }
            : {
                hostProfile: {
                    institutionName:    form.institutionName,
                    institutionType:    form.institutionType,
                    institutionWebsite: form.institutionWebsite,
                    institutionAddress: form.institutionAddress,
                    contactEmail:       form.contactEmail,
                    contactPhone:       form.contactPhone,
                },
            }),
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = buildPayload();
            const data    = await updateProfile(payload);
            setAuthData(data);
            if (setProfileCached) setProfileCached(data);
            showToast('Profile updated successfully', 'success');
            navigate('/profile');
        } catch {
            showToast('Failed to save changes. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const isEditing = location.pathname.includes('/edit');

    // ── Loading state ─────────────────────────────────────────────────────────
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[var(--qb-primary)]/20 border-t-[var(--qb-primary)] rounded-full animate-spin" />
                <p className={typography.micro}>Loading profile…</p>
            </div>
        </div>
    );

    // ── Page ──────────────────────────────────────────────────────────────────
    return (
        <ProfileTemplate
            title="Profile"
            name={form.name}
            email={user?.email}
            role={user?.role}
            plan={user?.subscription?.plan || user?.plan}
            actions={!isEditing ? (
                <button
                    onClick={() => navigate('/profile/edit')}
                    className={cx(buttonStyles.base, buttonStyles.primary, buttonStyles.sizeSm, 'w-full gap-1.5')}
                >
                    <Edit3 size={14} /> Edit Profile
                </button>
            ) : (
                <button
                    onClick={() => navigate('/profile')}
                    className={cx(buttonStyles.base, buttonStyles.ghost, buttonStyles.sizeSm, 'w-full gap-1.5')}
                >
                    <ArrowLeft size={14} /> Cancel
                </button>
            )}
        >
            <AnimatePresence mode="wait">

                {/* ── Edit Form ─────────────────────────────────────────── */}
                {isEditing ? (
                    <Motion.div
                        key="edit-form"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className={layout.section}
                    >
                        {toast ? <Toast {...toast} onClose={clearToast} /> : null}

                        {/* Section header */}
                        <div className="border-b theme-border pb-4">
                            <h2 className={typography.h2}>Edit Profile</h2>
                            <p className={cx(typography.body, 'mt-0.5')}>
                                Update your account details and preferences.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className={layout.section}>
                            {/* Field grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                {fields.map((f) => (
                                    <div
                                        key={f.key}
                                        className={f.type === 'textarea' ? 'md:col-span-2' : ''}
                                    >
                                        {/* Label row */}
                                        <div className={cx(layout.rowBetween, 'mb-1.5')}>
                                            <label className={cx(typography.micro, 'flex items-center gap-1.5')}>
                                                {f.label}
                                                {f.required && (
                                                    <span className="text-red-500">*</span>
                                                )}
                                            </label>
                                            {f.highlight && (
                                                <span className="text-xs font-medium text-[var(--qb-primary)] bg-[var(--qb-primary)]/10 px-2 py-0.5 rounded-full">
                                                    Premium
                                                </span>
                                            )}
                                        </div>

                                        {/* Input / Textarea */}
                                        {f.type === 'textarea' ? (
                                            <textarea
                                                value={form[f.key] || ''}
                                                onChange={(e) => handleChange(f.key, e.target.value)}
                                                rows={3}
                                                required={f.required}
                                                placeholder={`Enter ${f.label.toLowerCase()}…`}
                                                className={cx(
                                                    'w-full theme-surface border theme-border rounded-xl p-3 text-sm theme-text-primary focus:border-[var(--qb-primary)] outline-none transition-all resize-none placeholder:opacity-30',
                                                    f.highlight && 'border-[var(--qb-primary)]/30'
                                                )}
                                            />
                                        ) : (
                                            <input
                                                value={form[f.key] || ''}
                                                onChange={(e) => handleChange(f.key, e.target.value)}
                                                type={f.key === 'contactEmail' ? 'email' : 'text'}
                                                required={f.required}
                                                placeholder={`Enter ${f.label.toLowerCase()}…`}
                                                className={cx(
                                                    'w-full h-10 theme-surface border theme-border rounded-xl px-4 text-sm theme-text-primary focus:border-[var(--qb-primary)] outline-none transition-all placeholder:opacity-30',
                                                    f.highlight && 'border-[var(--qb-primary)]/30'
                                                )}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Form actions */}
                            <div className={cx(layout.rowEnd, 'pt-4 border-t theme-border gap-2')}>
                                <button
                                    type="button"
                                    onClick={() => navigate('/profile')}
                                    disabled={saving}
                                    className={cx(buttonStyles.base, buttonStyles.secondary, buttonStyles.sizeMd)}
                                >
                                    Discard
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className={cx(buttonStyles.base, buttonStyles.primary, buttonStyles.sizeMd, 'gap-1.5 min-w-[120px]')}
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Saving…
                                        </>
                                    ) : (
                                        <>
                                            <Save size={14} /> Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </Motion.div>
                ) : (

                    /* ── Dashboard View ─────────────────────────────────── */
                    <Motion.div
                        key="dashboard"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                    >
                        <ProfileDashboardTabs user={user} />
                    </Motion.div>
                )}
            </AnimatePresence>
        </ProfileTemplate>
    );
};

export default UserProfilePage;
