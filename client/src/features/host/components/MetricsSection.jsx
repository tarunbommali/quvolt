import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users } from 'lucide-react';
import { components, cx } from '../../../styles/index';

const MotionCard = motion(
    ({ className, children, ...props }) => (
        <div className={cx(components.analytics.card, 'relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border-white/20 dark:border-gray-700/30', className)} {...props}>
            <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
            {children}
        </div>
    )
);

const SubtleMetricItem = ({ label, value, colorClass, icon: Icon }) => (
    <div className={cx(components.analytics.subtleCard, 'flex items-center justify-between group transition-all duration-200 hover:border-indigo-500/30 hover:bg-white/60 dark:hover:bg-gray-800/60')}>
        <div className="flex flex-col gap-0.5">
            <p className={components.analytics.metricLabel}>{label}</p>
            {Icon && <Icon size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
        </div>
        <p className={cx(components.analytics.metricValue, colorClass, 'mt-0 font-bold text-xl tracking-tight')}>
            {value}
        </p>
    </div>
);

const MetricsSection = ({ primaryMetrics, performance, participants }) => {
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 },
    };

    return (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
            {/* 1. Primary Metrics */}
            <MotionCard variants={cardVariants} className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                        <BarChart3 size={20} />
                    </div>
                    <h3 className={cx(components.analytics.sectionTitleUpper, 'text-base font-bold text-gray-900 dark:text-white normal-case tracking-normal')}>Primary Metrics</h3>
                </div>
                <div className="flex flex-col gap-4">
                    {primaryMetrics.map((metric) => (
                        <SubtleMetricItem 
                            key={metric.label} 
                            label={metric.label} 
                            value={metric.value} 
                        />
                    ))}
                </div>
            </MotionCard>

            {/* 2. Performance Overview */}
            <MotionCard variants={cardVariants} className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                        <TrendingUp size={20} />
                    </div>
                    <h3 className={cx(components.analytics.sectionTitleUpper, 'text-base font-bold text-gray-900 dark:text-white normal-case tracking-normal')}>Performance Overview</h3>
                </div>
                <div className="flex flex-col gap-4">
                    <SubtleMetricItem 
                        label="Total Attempts" 
                        value={Number(performance.totalAttempts || 0).toLocaleString()} 
                    />
                    <SubtleMetricItem 
                        label="Avg Score" 
                        value={Number(performance.averageScore || 0).toFixed(1)} 
                    />
                    <SubtleMetricItem 
                        label="Accuracy" 
                        value={`${Number(performance.accuracyPercent || 0).toFixed(1)}%`}
                        colorClass={Number(performance.accuracyPercent) >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}
                    />
                </div>
            </MotionCard>

            {/* 3. Participant Insights */}
            <MotionCard variants={cardVariants} className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                        <Users size={20} />
                    </div>
                    <h3 className={cx(components.analytics.sectionTitleUpper, 'text-base font-bold text-gray-900 dark:text-white normal-case tracking-normal')}>Participant Insights</h3>
                </div>
                <div className="flex flex-col gap-4">
                    <SubtleMetricItem 
                        label="Invited Users" 
                        value={Number(participants.invitedUsers || 0).toLocaleString()} 
                    />
                    <SubtleMetricItem 
                        label="Joined Users" 
                        value={Number(participants.joinedUsers || 0).toLocaleString()} 
                    />
                    <SubtleMetricItem 
                        label="Completion Rate" 
                        value={`${Number(participants.completionRate || 0).toFixed(1)}%`}
                        colorClass="text-indigo-600 dark:text-indigo-400"
                    />
                </div>
            </MotionCard>
        </motion.div>
    );
};

export default MetricsSection;

