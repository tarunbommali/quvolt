

import { useAuthStore } from "../../../stores/useAuthStore";
import { Navigate } from "react-router-dom";
import LoadingScreen from "../LoadingScreen";



const AuthRoute = ({ children }) => {
    const user = useAuthStore((state) => state.user);
    const loading = useAuthStore((state) => state.loading);
    if (loading) return <LoadingScreen />;
    if (user) {
        if (user.role === 'participant') return <Navigate to="/join" />;
        if (user.role === 'host') return <Navigate to="/studio" />;
        if (user.role === 'admin') return <Navigate to="/dashboard" />;
        return <Navigate to="/" />;
    }
    return children;
};

export default AuthRoute;


