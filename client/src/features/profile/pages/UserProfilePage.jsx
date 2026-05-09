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


import { getProfileType } from '../utils/getProfileType';

import ProfileTemplate from '../components/ProfileTemplate';
import ProfileDashboardTabs from '../components/ProfileDashboardTabs';
import { FreeProfileForm, CreatorProfileForm, TeamsProfileForm } from '../components/forms/ProfileForms';
import Toast from '../../../components/common/Toast';
import useToast from '../../../hooks/useToast';
import { typography, buttonStyles, cards, layout, cx } from '../../../styles/index';

const UserProfilePage = () => {
    const navigate  = useNavigate();
    const location  = useLocation();

    const user            = useAuthStore((s) => s.user);
    const token           = useAuthStore((s) => s.token);
    const setAuthData     = useAuthStore((s) => s.setAuthData);
    const setProfileCached = useQuizStore((s) => s.setProfileCached);

    const { toast, showToast, clearToast } = useToast();

    const [form,    setForm]    = useState({});
    const [loading, setLoading] = useState(true);
    const [saving,  setSaving]  = useState(false);

    const type   = getProfileType(user);

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
        name: form.name,
        profilePhoto: form.profilePhoto,
        profile: form.profile,
        ...(type === 'CREATOR' ? { creator: form.creator } : {}),
        ...(type === 'TEAMS' ? { organization: form.organization } : {}),
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = buildPayload();
            const data    = await updateProfile(payload);
            setAuthData({ user: data, token });
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

    // Compute verified and avatar
    const isVerified = type === 'CREATOR' ? user?.creator?.verified : type === 'TEAMS' ? user?.organization?.verified : false;
    const avatar = (type === 'CREATOR' ? user?.creator?.branding?.logoUrl : type === 'TEAMS' ? user?.organization?.branding?.logoUrl : null) || user?.profilePhoto;

    // ── Page ──────────────────────────────────────────────────────────────────
    return (
        <ProfileTemplate
            title="Profile"
            name={form.name}
            email={user?.email}
            role={user?.role}
            plan={user?.subscription?.plan || user?.plan}
            avatarSrc={avatar}
            verified={isVerified}
            actions={!isEditing && (
                <button
                    onClick={() => navigate('/profile/edit')}
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 flex items-center justify-center text-white transition-all shadow-lg group-hover:scale-110 active:scale-95"
                    title="Edit Profile"
                >
                    <Edit3 size={18} />
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
                                {type === 'FREE' && <FreeProfileForm form={form} handleChange={handleChange} />}
                                {type === 'CREATOR' && <CreatorProfileForm form={form} handleChange={handleChange} />}
                                {type === 'TEAMS' && <TeamsProfileForm form={form} handleChange={handleChange} />}

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
