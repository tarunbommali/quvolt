import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { typography, cx } from '../../styles/index';

const SubHeader = ({
    title,
    subtitle,
    actions,
    breadcrumbs = [],
}) => {
    return (
        <Motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
        >
            {/* ── Breadcrumb Row (Standalone) ───────────────────────────── */}
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-1.5 px-0.5 mb-4">
                    {breadcrumbs.map((crumb, idx) => (
                        <React.Fragment key={idx}>
                            {crumb.path || crumb.href ? (
                                <Link
                                    to={crumb.path || crumb.href}
                                    className={typography.breadcrumbLink}
                                >
                                    {crumb.label}
                                </Link>
                            ) : (
                                <span className={typography.breadcrumbActive}>
                                    {crumb.label}
                                </span>
                            )}
                            {idx < breadcrumbs.length - 1 && (
                                <ChevronRight size={11} className="theme-text-muted opacity-40" />
                            )}
                        </React.Fragment>
                    ))}
                </nav>
            )}

            {/* ── Content Row (Title + Actions) ─────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="min-w-0 space-y-1">
                    <h1 className={typography.h1}>{title}</h1>
                    {subtitle && (
                        <p className={cx(typography.body, "opacity-70 max-w-2xl")}>{subtitle}</p>
                    )}
                </div>

                {/* ── Actions slot ─────────────────────────────────────────── */}
                {actions && (
                    <div className="flex w-full md:w-auto flex-wrap items-center gap-3 shrink-0">
                        {actions}
                    </div>
                )}
            </div>
        </Motion.div>
    );
};

export default SubHeader;
