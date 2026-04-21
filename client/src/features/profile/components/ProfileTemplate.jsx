import Card from '../../../components/common/ui/Card';
import SubHeader from '../../../components/layout/SubHeader';
import { components } from '../../../styles/components';
import { useSubscriptionTheme } from '../../../hooks/useSubscriptionTheme';
import { cx } from '../../../styles/theme';

const ProfileTemplate = ({
    title,
    subtitle,
    breadcrumbs,
    actions,
    avatarSrc,
    avatarFallback,
    name,
    email,
    plan,
    role,
    children,
}) => {
    const template = components.profileTemplate;
    const { theme, plan: currentPlan, isPro } = useSubscriptionTheme();

    return (
        <div className={template.page}>
            <SubHeader
                title={title}
                subtitle={subtitle}
                breadcrumbs={breadcrumbs}
                actions={actions}
            />

            <Card className={template.shell}>
                <div className={template.header}>
                    <div className={template.identity}>
                        <div className={template.avatar}>
                            {avatarSrc ? (
                                <img src={avatarSrc} alt={name || 'Profile'} className={template.avatarImage} />
                            ) : (
                                <span>{avatarFallback || 'U'}</span>
                            )}
                        </div>

                <div className={template.titleWrap}>
                            <div className="flex items-center justify-between">
                                <h1 className={template.titleRow}>
                                    <span className={template.title}>{name || 'User'}</span>
                                    {role !== 'participant' && (plan === 'CREATOR' || plan === 'TEAMS') && (
                                        <span className={cx(
                                            "ml-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 hover:scale-105",
                                            theme.colors.badgeBg,
                                            theme.colors.badgeText,
                                            isPro ? 'shadow-sm shadow-indigo-500/10' : ''
                                        )}>
                                            {theme.label}
                                        </span>
                                    )}
                                </h1>
                                {actions}
                            </div>
                            <p className={template.email}>{email || 'No email available'}</p>
                        </div>
                    </div>

                </div>

                <div className={template.body}>{children}</div>
            </Card>
        </div>
    );
};

export default ProfileTemplate;

