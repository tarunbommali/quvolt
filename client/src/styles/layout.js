/**
 * @file layout.js
 * @description Page layout tokens — consistent containers and grids.
 *
 * max-width: 1280px (7xl) — matches navbar
 * horizontal padding: 16px mobile / 24px desktop
 */

export const layout = {
    // ── Page shell ──────────────────────────────────────────────────────────
    page: 'max-w-7xl  mx-auto px-4 md:px-6 py-6 space-y-6',

    // ── Section spacing ──────────────────────────────────────────────────────
    section: 'space-y-4',
    sectionLg: 'space-y-6',
    stack: 'space-y-6',
    stackTight: 'space-y-3',

    // ── Grid systems ──────────────────────────────────────────────────────────
    grid2: 'grid grid-cols-1 md:grid-cols-2 gap-4',
    grid3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
    grid4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4',
    grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',

    // ── Metric grids ──────────────────────────────────────────────────────────
    metricGrid4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4',
    metricGrid3: 'grid grid-cols-1 md:grid-cols-3 gap-4',
    metricGrid2x4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4',

    // ── Chart grids ───────────────────────────────────────────────────────────
    chartGrid: 'grid grid-cols-1 gap-4 xl:grid-cols-2',

    // ── Row utilities ─────────────────────────────────────────────────────────
    rowBetween: 'flex items-center justify-between gap-3',
    rowStart: 'flex items-center gap-3',
    rowEnd: 'flex items-center justify-end gap-3',
};
