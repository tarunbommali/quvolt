/**
 * @file typography.js
 * @description Unified type scale — ChatGPT / Notion-level visual calm.
 *
 * SCALE (px → Tailwind)
 * ─────────────────────
 * display  32px  font-medium   → hero titles only
 * h1       24px  font-medium
 * h2       20px  font-medium
 * h3       16px  font-medium
 * h4       14px  font-medium
 * body     14px  font-normal
 * small    12px  font-normal
 * micro    11px  font-normal   muted
 *
 * RULES
 * ─────
 * • Never exceed 32px (2xl = display)
 * • font-semibold (600) is the maximum weight for headings
 * • font-medium  (500) for most UI labels
 * • font-normal  (400) for body / descriptions
 * • NEVER use font-black (900) for page headings
 * • Uppercase + tracking-widest → only micro labels (eyebrows)
 */

export const typography = {
    // ── Display — hero / page entry title ──────────────────────────────────
    display: 'text-[2rem] leading-tight font-semibold tracking-tight theme-text-primary',

    // ── Headings ────────────────────────────────────────────────────────────
    h1: 'text-2xl font-semibold leading-snug tracking-tight theme-text-primary',
    h2: 'text-xl  font-semibold leading-snug tracking-tight theme-text-primary',
    h3: 'text-base font-medium  leading-snug theme-text-primary',
    h4: 'text-sm  font-medium  leading-snug theme-text-primary',

    // ── Page / section titles (aliases) ─────────────────────────────────────
    pageTitle:    'text-2xl font-semibold leading-snug tracking-tight theme-text-primary',
    sectionTitle: 'text-base font-semibold theme-text-primary',
    cardTitle:    'text-sm  font-semibold theme-text-primary',

    // ── Body ─────────────────────────────────────────────────────────────────
    body:     'text-sm font-normal leading-relaxed theme-text-secondary',
    bodyMd:   'text-sm font-medium leading-relaxed theme-text-secondary',
    bodyStrong:'text-sm font-semibold theme-text-primary',

    // ── Small ─────────────────────────────────────────────────────────────────
    small:    'text-xs font-normal  theme-text-secondary',
    smallMd:  'text-xs font-medium  theme-text-secondary',

    // ── Micro — eyebrow labels, tags, breadcrumbs ─────────────────────────────
    micro:    'text-[11px] font-medium uppercase tracking-widest theme-text-muted',
    eyebrow:  'text-[11px] font-semibold uppercase tracking-[0.12em] theme-text-muted',

    // ── Metric values ─────────────────────────────────────────────────────────
    metricLg: 'text-3xl font-semibold leading-none theme-text-primary',  // stat cards
    metricMd: 'text-2xl font-semibold leading-none theme-text-primary',
    metricSm: 'text-lg  font-semibold leading-none theme-text-primary',

    // ── Muted helpers ─────────────────────────────────────────────────────────
    metaLabel: 'text-xs font-normal theme-text-muted',
    metaValue: 'text-sm font-medium theme-text-secondary',

    // ── Link ─────────────────────────────────────────────────────────────────
    link:     'text-[var(--qb-primary)] font-medium hover:underline transition-colors',
    emphasis: 'font-semibold theme-text-primary',

    // ── Breadcrumb ────────────────────────────────────────────────────────────
    breadcrumbBase:   'text-xs font-normal  theme-text-muted',
    breadcrumbLink:   'text-xs font-medium  theme-text-muted hover:theme-text-primary transition-colors',
    breadcrumbActive: 'text-xs font-semibold theme-text-primary',

    // ── Table ─────────────────────────────────────────────────────────────────
    tableHeader: 'text-xs font-semibold uppercase tracking-wide theme-text-muted',
    tableCell:   'text-sm  font-normal  theme-text-secondary',
    tableCellMd: 'text-sm  font-medium  theme-text-primary',
};
