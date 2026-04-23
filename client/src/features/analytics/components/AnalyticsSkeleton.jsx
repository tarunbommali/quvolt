import React from 'react';
import { cx } from '../../../styles/index';

const SkeletonBlock = ({ className = '' }) => (
    <div className={cx("bg-slate-100 dark:bg-slate-800 animate-pulse", className)} />
);

const AnalyticsSkeleton = () => (
    <div className="space-y-12 pb-16" aria-busy="true" aria-label="Loading analytics…">

        {/* Header Section */}
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-3">
                    <SkeletonBlock className="h-4 w-32 rounded-full" />
                    <SkeletonBlock className="h-12 w-[300px] rounded-xl" />
                    <SkeletonBlock className="h-5 w-80 rounded-lg" />
                </div>
                <SkeletonBlock className="h-10 w-32 rounded-xl" />
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonBlock key={i} className="h-32 rounded-2xl" />
                ))}
            </div>
        </div>

        {/* Section 1 — Performance Matrix */}
        <section className="space-y-6">
            <div className="space-y-2">
                <SkeletonBlock className="h-8 w-48 rounded-lg" />
                <SkeletonBlock className="h-4 w-72 rounded-md" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <SkeletonBlock className="lg:col-span-7 h-[400px] rounded-2xl" />
                <SkeletonBlock className="lg:col-span-5 h-[400px] rounded-2xl" />
            </div>
        </section>

        {/* Section 2 — Audience */}
        <section className="space-y-6">
            <div className="space-y-2">
                <SkeletonBlock className="h-8 w-64 rounded-lg" />
                <SkeletonBlock className="h-4 w-80 rounded-md" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonBlock key={i} className="h-32 rounded-2xl" />
                ))}
            </div>
            <SkeletonBlock className="h-24 rounded-2xl" />
        </section>

        {/* Section 3 — Question Intelligence */}
        <section className="space-y-6">
            <div className="space-y-2">
                <SkeletonBlock className="h-8 w-56 rounded-lg" />
                <SkeletonBlock className="h-4 w-72 rounded-md" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonBlock key={i} className="h-48 rounded-2xl" />
                ))}
            </div>
        </section>
    </div>
);

export default AnalyticsSkeleton;
