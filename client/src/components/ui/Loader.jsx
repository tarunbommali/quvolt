import { cx } from '../../styles/theme';

const Loader = ({ className = '' }) => {
    return (
        <div className={cx('flex items-center justify-center', className)}>
            <div className="loader-premium h-10 w-10 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
        </div>
    );
};

export default Loader;
