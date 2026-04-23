import { layout } from '../../styles/index';


const Container = ({ children, className = '' }) => {
  return (
    <div className={`${layout.page} ${className}`}>
      {children}
    </div>
  );
};

export default Container;
