import { cards, cx } from '../../../styles/index';


const Card = ({ children, className = '' }) => {
    return (
        <div className={cx('surface-card', cards.base, className)}>
            {children}
        </div>
    );
};

export default Card;
