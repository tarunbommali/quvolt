/**
 * Reusable skeleton loader for cards
 * ✅ Animated loading state
 * ✅ Customizable count
 */
const SkeletonCard = ({ count = 3, className = '' }) => {
    return (
        <div className={className}>
            {[...Array(count)].map((_, i) => (
                <div
                    key={i}
                    className="mb-4 space-y-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                >
                    {/* Header skeleton */}
                    <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />

                    {/* Content skeleton */}
                    <div className="space-y-2">
                        <div className="h-3 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
                        <div className="h-3 w-5/6 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
                    </div>

                    {/* Footer skeleton */}
                    <div className="flex gap-2 pt-2">
                        <div className="h-8 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
                        <div className="h-8 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SkeletonCard;
