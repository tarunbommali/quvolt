/**
 * @file spacing.js
 * @description Strict spacing token registry.
 *
 * SCALE (px → Tailwind class)
 * ───────────────────────────
 * xs   →  4px   (gap-1  / p-1)
 * sm   →  8px   (gap-2  / p-2)
 * md   → 12px   (gap-3  / p-3)
 * lg   → 16px   (gap-4  / p-4)
 * xl   → 20px   (gap-5  / p-5)
 * 2xl  → 24px   (gap-6  / p-6)
 * 3xl  → 32px   (gap-8  / p-8)
 * 4xl  → 48px   (gap-12 / p-12)
 *
 * Usage: import { spacing } from '../styles/spacing';
 * Then:  <div className={spacing.section}>…</div>
 */

export const spacing = {
    // ── Raw scale tokens ────────────────────────────────────────────────────
    xs:  '4px',
    sm:  '8px',
    md:  '12px',
    lg:  '16px',
    xl:  '20px',
    '2xl': '24px',
    '3xl': '32px',
    '4xl': '48px',

    // ── Stack gaps (vertical rhythm) ────────────────────────────────────────
    stackXs:  'space-y-1',   // 4px  — tightly related items
    stackSm:  'space-y-2',   // 8px  — form fields, meta rows
    stackMd:  'space-y-3',   // 12px — card internals
    stackLg:  'space-y-4',   // 16px — card sections
    stackXl:  'space-y-5',   // 20px — between cards
    stack2xl: 'space-y-6',   // 24px — between page sections
    stack3xl: 'space-y-8',   // 32px — between major blocks

    // ── Inline gaps (horizontal rhythm) ─────────────────────────────────────
    inlineXs:  'gap-1',
    inlineSm:  'gap-2',
    inlineMd:  'gap-3',
    inlineLg:  'gap-4',
    inlineXl:  'gap-5',
    inline2xl: 'gap-6',

    // ── Card padding ─────────────────────────────────────────────────────────
    cardPad:    'p-4',        // 16px — compact cards
    cardPadMd:  'p-5',        // 20px — default cards
    cardPadLg:  'p-6',        // 24px — roomy cards

    // ── Section vertical padding ─────────────────────────────────────────────
    sectionY:   'py-6',       // 24px top/bottom
    sectionYLg: 'py-8',       // 32px top/bottom
    pageBottom: 'pb-24',

    // ── Section as a combined class ─────────────────────────────────────────
    section:    'space-y-4',  // 16px inner gap — default section
    sectionLg:  'space-y-6',  // 24px inner gap — page-level section
};
