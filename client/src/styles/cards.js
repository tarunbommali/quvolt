/**
 * @file cards.js
 * @description Unified card system — identical look across every page.
 *
 * VARIANTS
 * ────────
 * default    → primary content card  (white/dark bg, subtle border, no heavy shadow)
 * subtle     → metric / background card (softer surface)
 * interactive → hover-lift + click effect
 * elevated   → slightly raised (sidebar / featured)
 * flat       → no border / no shadow (inside another card)
 *
 * RULES
 * ─────
 * • border-radius: 16px (rounded-2xl) everywhere — NO rounded-3xl / rounded-[3rem] per card
 * • border: 1px theme-border (never double-border or heavy shadow)
 * • padding: 16px (p-4) compact / 20px (p-5) default
 * • NO custom shadows per component
 */

const BASE_SHAPE = 'rounded-2xl border theme-border';
const BASE_BG    = 'theme-surface';
const BASE_SHADOW = 'shadow-sm';
const BASE_PAD   = 'p-4 md:p-5';

export const cards = {
    // ── Structural base (shape + border + bg) ────────────────────────────────
    base: `${BASE_SHAPE} ${BASE_BG} ${BASE_SHADOW} ${BASE_PAD}`,

    // ── Default — main content card ──────────────────────────────────────────
    default: `${BASE_SHAPE} ${BASE_BG} ${BASE_SHADOW} ${BASE_PAD}`,

    // ── Subtle — metric / stat cards ─────────────────────────────────────────
    subtle: `${BASE_SHAPE} theme-surface-soft ${BASE_PAD}`,

    // ── Interactive — hoverable list/grid cards ───────────────────────────────
    interactive: `${BASE_SHAPE} ${BASE_BG} ${BASE_SHADOW} ${BASE_PAD} transition-all duration-200 hover:theme-surface-soft hover:-translate-y-0.5 cursor-pointer`,

    // ── Elevated — sidebar / featured card ───────────────────────────────────
    elevated: `${BASE_SHAPE} ${BASE_BG} shadow-md ${BASE_PAD}`,

    // ── Flat — inside another card, no visual layer ───────────────────────────
    flat: `${BASE_SHAPE} theme-surface-soft p-3`,

    // ── Form card — for form sections / panels ────────────────────────────────
    form: `${BASE_SHAPE} ${BASE_BG} ${BASE_SHADOW} p-5 md:p-6`,

    // ── Metric card — stat displays ───────────────────────────────────────────
    metric: `${BASE_SHAPE} ${BASE_BG} ${BASE_SHADOW} p-4 md:p-5 space-y-3`,

    // ── Dashed empty state ────────────────────────────────────────────────────
    empty: 'rounded-2xl border border-dashed theme-border p-8 text-center',

    // ── Header row inside a card ─────────────────────────────────────────────
    header: 'flex items-center justify-between gap-3 mb-4',

    // ── Section divider inside a card ────────────────────────────────────────
    divider: 'border-t theme-border pt-4 mt-4',
};
