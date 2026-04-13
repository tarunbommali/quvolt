export const motionTokens = {
    transition: {
        smooth: { duration: 0.35, ease: 'easeOut' },
        snappy: { duration: 0.2, ease: 'easeOut' },
        slow: { duration: 0.6, ease: 'easeInOut' },
    },
    fadeUp: {
        hidden: { opacity: 0, y: 24 },
        visible: { opacity: 1, y: 0 },
    },
    fadeIn: {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
    },
    scaleIn: {
        hidden: { opacity: 0, scale: 0.96 },
        visible: { opacity: 1, scale: 1 },
    },
    hoverLift: {
        whileHover: { y: -4, scale: 1.01 },
        whileTap: { scale: 0.985 },
    },
    staggerFast: {
        visible: {
            transition: {
                staggerChildren: 0.06,
            },
        },
    },
    staggerSoft: {
        visible: {
            transition: {
                staggerChildren: 0.1,
            },
        },
    },
};
