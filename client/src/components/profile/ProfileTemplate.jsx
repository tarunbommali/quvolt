import Card from '../ui/Card';
import SubHeader from '../layout/SubHeader';
import { components } from '../../styles/components';

const ProfileTemplate = ({
    title,
    subtitle,
    breadcrumbs,
    actions,
    avatarSrc,
    avatarFallback,
    name,
    email,
    children,
}) => {
    const template = components.profileTemplate;

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
                            <h1 className={template.titleRow}>
                                <span className={template.title}>{name || 'User'}</span>
                            </h1>
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