import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { typography } from '../../styles/index';

const BreadCrumbs = ({ breadcrumbs = [],
}) => {
    return (
        <Motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-4 flex-wrap"
        >
            {/* ── Breadcrumb Nav ────────────────────────────────────────────── */}
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-1.5 px-0.5">
                    {breadcrumbs.map((crumb, idx) => (
                        <React.Fragment key={idx}>
                            {crumb.path || crumb.href ? (
                                <Link
                                    to={crumb.path || crumb.href}
                                    state={crumb.state}
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

        </Motion.div>
    );
};

export default BreadCrumbs;
