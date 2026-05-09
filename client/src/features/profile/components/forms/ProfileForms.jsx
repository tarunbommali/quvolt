import React from 'react';
import { typography, layout, cx } from '../../../../styles/index';

const TextInput = ({ label, value, onChange, required, placeholder, highlight }) => (
    <div>
        <div className={cx(layout.rowBetween, 'mb-1.5')}>
            <label className={cx(typography.micro, 'flex items-center gap-1.5')}>
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {highlight && (
                <span className="text-xs font-medium text-[var(--qb-primary)] bg-[var(--qb-primary)]/10 px-2 py-0.5 rounded-full">
                    Premium
                </span>
            )}
        </div>
        <input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            placeholder={placeholder || `Enter ${label.toLowerCase()}…`}
            className={cx(
                'w-full h-10 theme-surface border theme-border rounded-xl px-4 text-sm theme-text-primary focus:border-[var(--qb-primary)] outline-none transition-all placeholder:opacity-30',
                highlight && 'border-[var(--qb-primary)]/30'
            )}
        />
    </div>
);

const TextArea = ({ label, value, onChange, required, placeholder, highlight }) => (
    <div className="md:col-span-2">
        <div className={cx(layout.rowBetween, 'mb-1.5')}>
            <label className={cx(typography.micro, 'flex items-center gap-1.5')}>
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {highlight && (
                <span className="text-xs font-medium text-[var(--qb-primary)] bg-[var(--qb-primary)]/10 px-2 py-0.5 rounded-full">
                    Premium
                </span>
            )}
        </div>
        <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            required={required}
            placeholder={placeholder || `Enter ${label.toLowerCase()}…`}
            className={cx(
                'w-full theme-surface border theme-border rounded-xl p-3 text-sm theme-text-primary focus:border-[var(--qb-primary)] outline-none transition-all resize-none placeholder:opacity-30',
                highlight && 'border-[var(--qb-primary)]/30'
            )}
        />
    </div>
);

export const GlobalSettingsForm = ({ form, handleChange }) => {
    const handleProfileChange = (key, val) => {
        handleChange('profile', { ...form.profile, [key]: val });
    };

    return (
        <div>
            <h3 className={cx(typography.h3, "mb-4")}>Global Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <TextInput label="Language" value={form.profile?.language} onChange={(v) => handleProfileChange('language', v)} />
                <TextInput label="Timezone" value={form.profile?.timezone} onChange={(v) => handleProfileChange('timezone', v)} />
                
                <div className="md:col-span-2">
                    <label className={cx(typography.micro, 'flex items-center gap-1.5 mb-1.5')}>Email Notifications</label>
                    <select 
                        value={form.profile?.emailPreferences !== false ? 'true' : 'false'} 
                        onChange={(e) => handleProfileChange('emailPreferences', e.target.value === 'true')}
                        className="w-full h-10 theme-surface border theme-border rounded-xl px-4 text-sm theme-text-primary focus:border-[var(--qb-primary)] outline-none transition-all"
                    >
                        <option value="true">Enabled (Recommended)</option>
                        <option value="false">Disabled</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export const FreeProfileForm = ({ form, handleChange }) => {
    const handleProfileChange = (key, val) => {
        handleChange('profile', { ...form.profile, [key]: val });
    };

    return (
        <div className="space-y-8">
            <GlobalSettingsForm form={form} handleChange={handleChange} />
            <div className="pt-6 border-t theme-border">
                <h3 className={cx(typography.h3, "mb-4")}>Personal Identity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <TextInput label="Full Name" required value={form.name} onChange={(v) => handleChange('name', v)} />
                    <TextInput label="Display Name" value={form.profile?.displayName} onChange={(v) => handleProfileChange('displayName', v)} />
                    <TextInput label="Role" value={form.profile?.role} onChange={(v) => handleProfileChange('role', v)} />
                    <TextInput label="Subjects (comma separated)" value={form.profile?.subjects?.join(', ')} onChange={(v) => handleProfileChange('subjects', v.split(',').map(s => s.trim()))} />
                </div>
            </div>
        </div>
    );
};

export const CreatorProfileForm = ({ form, handleChange }) => {
    const handleCreatorChange = (key, val) => {
        handleChange('creator', { ...form.creator, [key]: val });
    };
    const handleCreatorBrandingChange = (key, val) => {
        handleChange('creator', { ...form.creator, branding: { ...form.creator?.branding, [key]: val } });
    };

    return (
        <div className="space-y-8">
            <GlobalSettingsForm form={form} handleChange={handleChange} />

            <div className="pt-6 border-t theme-border">
                <h3 className={cx(typography.h3, "mb-4")}>Personal Identity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <TextInput label="Full Name" required value={form.name} onChange={(v) => handleChange('name', v)} />
                    <TextInput label="Display Name" value={form.profile?.displayName} onChange={(v) => handleChange('profile', { ...form.profile, displayName: v })} />
                    <TextInput label="Role" value={form.profile?.role} onChange={(v) => handleChange('profile', { ...form.profile, role: v })} />
                    <TextInput label="Subjects (comma separated)" value={form.profile?.subjects?.join(', ')} onChange={(v) => handleChange('profile', { ...form.profile, subjects: v.split(',').map(s => s.trim()) })} />
                </div>
            </div>

            <div className="pt-6 border-t theme-border">
                <h3 className={cx(typography.h3, "mb-4")}>Creator Brand</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <TextInput label="Brand Name" value={form.creator?.brandName} onChange={(v) => handleCreatorChange('brandName', v)} highlight />
                    <TextInput label="Tagline" value={form.creator?.tagline} onChange={(v) => handleCreatorChange('tagline', v)} highlight />
                    <TextInput label="Website" value={form.creator?.website} onChange={(v) => handleCreatorChange('website', v)} highlight />
                    <TextInput label="Certifications / Credentials" value={form.creator?.certifications} onChange={(v) => handleCreatorChange('certifications', v)} highlight />
                    <TextInput label="Hiring Domain" value={form.creator?.hiringDomain} onChange={(v) => handleCreatorChange('hiringDomain', v)} highlight />
                </div>
            </div>

            <div className="pt-6 border-t theme-border">
                <h3 className={cx(typography.h3, "mb-4")}>Brand Aesthetics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <TextInput label="Brand Logo URL" value={form.creator?.branding?.logoUrl} onChange={(v) => handleCreatorBrandingChange('logoUrl', v)} highlight />
                    <TextArea label="Brand Description" value={form.creator?.branding?.description} onChange={(v) => handleCreatorBrandingChange('description', v)} highlight />
                </div>
            </div>
        </div>
    );
};

export const TeamsProfileForm = ({ form, handleChange }) => {
    const handleOrgChange = (key, val) => {
        handleChange('organization', { ...form.organization, [key]: val });
    };
    const handleOrgNestedChange = (parentKey, key, val) => {
        handleChange('organization', { 
            ...form.organization, 
            [parentKey]: { ...form.organization?.[parentKey], [key]: val } 
        });
    };

    return (
        <div className="space-y-8">
            <GlobalSettingsForm form={form} handleChange={handleChange} />

            <div className="pt-6 border-t theme-border">
                <h3 className={cx(typography.h3, "mb-4")}>Organization Identity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <TextInput label="Organization Name" required value={form.organization?.name} onChange={(v) => handleOrgChange('name', v)} highlight />
                    <TextInput label="Type (university, institute, company)" value={form.organization?.type} onChange={(v) => handleOrgChange('type', v)} highlight />
                    <TextInput label="Domain (e.g. harvard.edu)" required value={form.organization?.domain} onChange={(v) => handleOrgChange('domain', v)} highlight />
                    <TextInput label="Website" value={form.organization?.website} onChange={(v) => handleOrgChange('website', v)} highlight />
                    <TextInput label="GST / Tax ID" value={form.organization?.taxId} onChange={(v) => handleOrgChange('taxId', v)} highlight />
                </div>
            </div>

            <div className="pt-6 border-t theme-border">
                <h3 className={cx(typography.h3, "mb-4")}>Academic & Industry</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <TextInput label="Departments / Sub-teams (comma separated)" value={form.organization?.departments || form.organization?.academic?.department} onChange={(v) => handleOrgChange('departments', v)} highlight />
                    <TextInput label="Affiliation" value={form.organization?.academic?.affiliation} onChange={(v) => handleOrgNestedChange('academic', 'affiliation', v)} highlight />
                </div>
            </div>

            <div className="pt-6 border-t theme-border">
                <h3 className={cx(typography.h3, "mb-4")}>Contact & Branding</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <TextInput label="Email" value={form.organization?.contact?.email} onChange={(v) => handleOrgNestedChange('contact', 'email', v)} highlight />
                    <TextInput label="Phone" value={form.organization?.contact?.phone} onChange={(v) => handleOrgNestedChange('contact', 'phone', v)} highlight />
                    <TextInput label="Organization Logo URL" value={form.organization?.branding?.logoUrl} onChange={(v) => handleOrgNestedChange('branding', 'logoUrl', v)} highlight />
                    <TextArea label="Description" value={form.organization?.branding?.description} onChange={(v) => handleOrgNestedChange('branding', 'description', v)} highlight />
                </div>
            </div>
        </div>
    );
};
