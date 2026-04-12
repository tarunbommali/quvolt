import { useEffect, useRef } from 'react';

const ViewportPrefetch = ({
    onPrefetch,
    rootMargin = '260px 0px',
    threshold = 0.01,
    once = true,
    className,
    children,
}) => {
    const nodeRef = useRef(null);
    const hasPrefetchedRef = useRef(false);

    useEffect(() => {
        const node = nodeRef.current;
        if (!node) return undefined;

        if (hasPrefetchedRef.current && once) return undefined;

        if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
            if (!hasPrefetchedRef.current || !once) {
                hasPrefetchedRef.current = true;
                onPrefetch?.();
            }
            return undefined;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    if (once && hasPrefetchedRef.current) return;

                    hasPrefetchedRef.current = true;
                    onPrefetch?.();

                    if (once) {
                        observer.unobserve(entry.target);
                    }
                });
            },
            { root: null, rootMargin, threshold },
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [onPrefetch, once, rootMargin, threshold]);

    return <div ref={nodeRef} className={className}>{children}</div>;
};

export default ViewportPrefetch;