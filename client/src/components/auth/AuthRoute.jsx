

import { useAuthStore } from "../../stores/useAuthStore";
import { Navigate } from "react-router-dom";
import LoadingScreen from "../common/LoadingScreen";



const AuthRoute = ({ children }) => {
    const user = useAuthStore((state) => state.user);
    const loading = useAuthStore((state) => state.loading);
    if (loading) return <LoadingScreen />;
    if (user) {
        if (user.role === 'organizer') return <Navigate to="/studio" />;
        return <Navigate to="/join" />;
    }
    return children;
};

export default AuthRoute;

