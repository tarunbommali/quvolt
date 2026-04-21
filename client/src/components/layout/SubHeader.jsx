import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const SubHeader = ({ 
    title, 
    subtitle, 
    actions, 
    breadcrumbs = [] 
}) => {
    return (
        <div className="mb-6 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 space-y-1">
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <nav className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest theme-text-muted mb-2">
                        {breadcrumbs.map((crumb, idx) => (
                            <React.Fragment key={idx}>
                                {crumb.path || crumb.href ? (
                                    <Link to={crumb.path || crumb.href} className="hover:theme-text-primary transition-colors">
                                        {crumb.label}
                                    </Link>
                                ) : (
                                    <span>{crumb.label}</span>
                                )}
                                {idx < breadcrumbs.length - 1 && <ChevronRight size={10} className="opacity-40" />}
                            </React.Fragment>
                        ))}
                    </nav>
                )}

                <h1 className="text-2xl md:text-3xl font-black tracking-tight theme-text-primary truncate">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-sm theme-text-secondary mt-1.5 opacity-80">
                        {subtitle}
                    </p>
                )}
            </div>

            {actions && (
                <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:justify-end">
                    {actions}
                </div>
            )}
        </div>
    );
};

export default SubHeader;
