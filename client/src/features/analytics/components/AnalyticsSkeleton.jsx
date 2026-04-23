import React from 'react';

/**
 * SkeletonBlock — single animated pulse block.
 */
const SkeletonBlock = ({ className = '' }) => (
    <div className={`rounded-3xl bg-gray-200 dark:bg-gray-800 animate-pulse ${className}`} />
);

/**
 * AnalyticsSkeleton
 * Shows a realistic loading skeleton that matches the analytics dashboard layout.
 * Replaces the generic spinner to give users a sense of content shape.
 */
const AnalyticsSkeleton = () => (
    <div className="space-y-10 pb-20" aria-busy="true" aria-label="Loading analytics…">

        {/* Session picker skeleton */}
        <SkeletonBlock className="h-16 w-full" />

        {/* Section 1 — Session Summary */}
        <section className="space-y-5">
            <div className="flex items-center justify-between">
                <SkeletonBlock className="h-5 w-40" />
                <SkeletonBlock className="h-5 w-24 rounded-full" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonBlock key={i} className="h-28" />
                ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <SkeletonBlock className="h-16" />
                <SkeletonBlock className="h-16" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SkeletonBlock className="h-64" />
                <SkeletonBlock className="h-64" />
            </div>
        </section>

        {/* Section 2 — Audience */}
        <section className="space-y-5">
            <div className="flex items-center justify-between">
                <SkeletonBlock className="h-5 w-52" />
                <SkeletonBlock className="h-5 w-32 rounded-full" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SkeletonBlock className="h-80" />
                <SkeletonBlock className="h-80" />
            </div>
        </section>

        {/* Section 3 — Questions */}
        <section className="space-y-5">
            <div className="flex items-center justify-between">
                <SkeletonBlock className="h-5 w-48" />
                <SkeletonBlock className="h-5 w-28 rounded-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonBlock key={i} className="h-28" />
                ))}
            </div>
            <SkeletonBlock className="h-64" />
        </section>
    </div>
);

export default AnalyticsSkeleton;
