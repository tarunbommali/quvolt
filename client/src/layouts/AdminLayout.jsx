import { Outlet, Link } from 'react-router-dom';
import Footer from '../components/common/Footer';

const AdminLayout = () => (
  <div className="flex flex-col min-h-screen">
    <div className="flex-1">
      <nav className="p-4 border-b theme-border mb-4 theme-surface flex gap-3 text-sm font-medium">
        <span className="theme-text-primary font-bold">ADMIN PANEL</span>
        <span className="theme-text-muted">|</span>
        <Link to="/dashboard" className="theme-text-secondary hover:theme-primary">Dashboard</Link>
        <Link to="/users" className="theme-text-secondary hover:theme-primary">Users</Link>
        <Link to="/billing" className="theme-text-secondary hover:theme-primary">Billing</Link>
      </nav>
      <Outlet />
    </div>
    <Footer />
  </div>
);
export default AdminLayout;
