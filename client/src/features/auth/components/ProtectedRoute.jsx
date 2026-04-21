import { useAuthStore } from "../../../stores/useAuthStore";
import { Navigate } from "react-router-dom";
import LoadingScreen from "../LoadingScreen";


const ProtectedRoute = ({ children, role }) => {
    const user = useAuthStore((state) => state.user);
    const loading = useAuthStore((state) => state.loading);
    if (loading) return <LoadingScreen />;
    if (!user) return <Navigate to="/login" />;
    if (role && user.role !== role) return <Navigate to="/" />;
    return children;
};

export default ProtectedRoute;


