import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

const Spinner = () => (
  <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
);


const RoleGuard = ({ roles, children }) => {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loading = useAuthStore((state) => state.loading);

  if (loading) return <Spinner />;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!roles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
};

export default RoleGuard;
