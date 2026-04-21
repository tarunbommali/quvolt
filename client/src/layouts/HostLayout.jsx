import { Outlet } from 'react-router-dom';
import Footer from '../components/common/Footer';

const hostLayout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 min-h-screen">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
};
export default hostLayout;
