import { motion as Motion } from 'framer-motion';

/**
 * Reusable empty state component
 * ✅ Consistent empty state experience
 * ✅ Optional action button
 */
const EmptyState = ({
    icon: Icon = null,
    title = 'No data',
    subtitle = '',
    action = null,
    imageUrl = null,
}) => {
    return (
        <Motion.div
            className="flex flex-col items-center justify-center space-y-4 rounded-2xl border border-gray-200 bg-gray-50/50 p-12 text-center dark:border-gray-700 dark:bg-gray-800/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            {imageUrl && <img src={imageUrl} alt="empty" className="h-24 w-24 opacity-50" />}

            {Icon && <Icon size={48} className="text-gray-300 dark:text-gray-600" />}

            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                {subtitle && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>}
            </div>

            {action && <div className="pt-2">{action}</div>}
        </Motion.div>
    );
};

export default EmptyState;
