export const cx = (...classes) => classes.filter(Boolean).join(' ');

export const theme = {
    surface: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
    panel: 'bg-gray-50 dark:bg-gray-900',
    textPrimary: 'text-gray-900 dark:text-gray-100',
    textSecondary: 'text-gray-600 dark:text-gray-400',
    textMeta: 'text-gray-400 dark:text-gray-500',
    focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
};
