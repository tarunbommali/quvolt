import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

const Spinner = () => (
  <div className="p-12 text-center theme-text-muted font-medium animate-pulse">
    Loading...
  </div>
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
  const normalizedUserRole = user?.role === 'host' ? 'host' : user?.role;
  if (!roles.includes(normalizedUserRole)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
};

export default RoleGuard;
