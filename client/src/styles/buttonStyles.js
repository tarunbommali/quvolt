/**
 * @file buttonStyles.js
 * @description Consistent button system — height 36-44px, font-medium, rounded-xl.
 */

export const buttonStyles = {
    // ── Base — shared structure ────────────────────────────────────────────
    base: 'inline-flex items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium h-9 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qb-primary)] focus-visible:ring-offset-2',

    // ── Variants ────────────────────────────────────────────────────────────
    primary:   'bg-[var(--qb-primary)] text-white hover:bg-[var(--qb-primary-strong)] shadow-sm',
    secondary: 'border theme-border theme-surface theme-text-secondary hover:theme-surface-soft',
    ghost:     'theme-text-secondary hover:theme-surface-soft hover:theme-text-primary',
    danger:    'border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400',
    success:   'bg-emerald-600 text-white hover:bg-emerald-700',
    neutral:   'border theme-border theme-surface theme-text-secondary hover:theme-surface-soft',

    // ── Sizes ────────────────────────────────────────────────────────────────
    sizeSm: 'h-8  px-3 text-xs',
    sizeMd: 'h-9  px-4 text-sm',
    sizeLg: 'h-10 px-5 text-sm',

    // ── Icon-only ─────────────────────────────────────────────────────────────
    icon:   'inline-flex h-9 w-9 items-center justify-center rounded-xl',
    iconSm: 'inline-flex h-8 w-8 items-center justify-center rounded-lg',
};
