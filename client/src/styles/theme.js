export const cx = (...classes) => classes.filter(Boolean).join(' ');

export const theme = {
    surface: 'theme-surface border theme-border',
    surfaceGlass: 'glass-surface rounded-2xl',
    surfaceDepth: 'depth-card',
    accentGlow: 'glow-border',
    panel: 'theme-surface-soft',
    textPrimary: 'theme-text-primary',
    textSecondary: 'theme-text-secondary',
    textMeta: 'theme-text-muted',
    focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qb-primary)] focus-visible:ring-offset-2',
};
