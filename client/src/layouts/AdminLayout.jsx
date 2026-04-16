import { Outlet } from 'react-router-dom';

import { Link } from 'react-router-dom';
const AdminLayout = () => (
  <div>
    <nav style={{ padding: '1rem', borderBottom: '1px solid #eee', marginBottom: 16 }}>
      <Link to="/dashboard">Admin</Link> |{' '}
      <Link to="/studio">Organizer</Link> |{' '}
      <Link to="/join">Participant</Link>
    </nav>
    {/* Admin-specific navbar/sidebar here */}
    <Outlet />
  </div>
);
export default AdminLayout;
