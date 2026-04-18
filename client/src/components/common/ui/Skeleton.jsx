const Skeleton = ({ className = '' }) => (
    <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`.trim()} />
);

export default Skeleton;
