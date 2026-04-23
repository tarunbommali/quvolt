import React from 'react';

import { layoutStyles } from '../../../styles/layoutStyles';
import { components, textStyles, cx, layout } from '../../../styles/index';

export const PageShell = ({ children, className }) => (
    <div className={cx("min-h-screen pb-24", className)}>
        <div className={layout.page}>
            {children}
        </div>
    </div>
);

export const AppSection = ({ title, subtitle, children, className }) => (
    <section className={cx("space-y-8", className)}>
        {(title || subtitle) && (
            <div className="space-y-2">
                {title && <h2 className="text-3xl font-black theme-text-primary tracking-tighter uppercase">{title}</h2>}
                {subtitle && <p className="text-sm font-bold theme-text-muted opacity-60 max-w-2xl">{subtitle}</p>}
            </div>
        )}
        {children}
    </section>
);

export const AppCard = ({ children, className, variant = "base", padded = true }) => {
    const baseClass = variant === "analytics" ? components.analytics.card : components.panel;
    return (
        <div className={cx(
            baseClass,
            padded ? "!p-8" : "!p-0",
            "!rounded-[2.5rem] border-2 theme-border shadow-2xl shadow-indigo-500/5",
            className
        )}>
            {children}
        </div>
    );
};

export const AppGrid = ({ children, cols = 3, gap = 6, className }) => {
    const gridCols = {
        1: 'grid-cols-1',
        2: 'grid-cols-1 md:grid-cols-2',
        3: 'grid-cols-1 md:grid-cols-3',
        4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    };

    return (
        <div className={cx("grid", gridCols[cols], `gap-${gap}`, className)}>
            {children}
        </div>
    );
};
