import { Outlet } from 'react-router-dom';

import { Link } from 'react-router-dom';
const AdminLayout = () => (
  <div>
    <nav className="p-4 border-b theme-border mb-4 theme-surface flex gap-3 text-sm font-medium">
      <Link to="/dashboard" className="theme-text-primary hover:theme-primary">Admin</Link>
      <span className="theme-text-muted">|</span>
      <Link to="/studio" className="theme-text-secondary hover:theme-text-primary">Host</Link>
      <span className="theme-text-muted">|</span>
      <Link to="/join" className="theme-text-secondary hover:theme-text-primary">Participant</Link>
    </nav>
    {/* Admin-specific navbar/sidebar here */}
    <Outlet />
  </div>
);
export default AdminLayout;
