import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { layoutStyles } from '../../styles/layoutStyles';
import { textStyles } from '../../styles/commonStyles';

const SubHeader = ({ title, subtitle, breadcrumbs = [], actions = null }) => {
    const showBreadcrumbs = Array.isArray(breadcrumbs) && breadcrumbs.length > 1;

    return (
        <div className={layoutStyles.subHeader}>
            <div className={layoutStyles.subHeaderInfo}>
                {showBreadcrumbs && (
                    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1">
                        {breadcrumbs.map((crumb, index) => {
                            const isLast = index === breadcrumbs.length - 1;
                            const key = `${crumb.label}-${index}`;

                            return (
                                <Fragment key={key}>
                                    {isLast || !crumb.href ? (
                                        <span className={textStyles.breadcrumbActive}>{crumb.label}</span>
                                    ) : (
                                        <Link to={crumb.href} className={textStyles.breadcrumbLink}>
                                            {crumb.label}
                                        </Link>
                                    )}
                                    {!isLast && <span className={textStyles.breadcrumbBase}>/</span>}
                                </Fragment>
                            );
                        })}
                    </nav>
                )}

                <h1 className={textStyles.subHeaderTitle}>{title}</h1>
                {subtitle && <p className={textStyles.subtitle}>{subtitle}</p>}
            </div>

            {actions ? <div className={layoutStyles.subHeaderActions}>{actions}</div> : null}
        </div>
    );
};

export default SubHeader;
