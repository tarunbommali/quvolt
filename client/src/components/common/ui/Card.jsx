import { cards } from '../../../styles/cards';
import { cx } from '../../../styles/theme';

const Card = ({ children, className = '' }) => {
    return (
        <div className={cx('surface-card', cards.base, className)}>
            {children}
        </div>
    );
};

export default Card;
