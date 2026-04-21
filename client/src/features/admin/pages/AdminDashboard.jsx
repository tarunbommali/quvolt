import { useAuthStore } from '../../../stores/useAuthStore';

const AdminDashboard = () => {
    const user = useAuthStore((s) => s.user);

    if (!user) return <div>Loading admin dashboard...</div>;

    return (
        <div>
            <h1>Admin Dashboard</h1>
            <div>Name: {user.name}</div>
            <div>Email: {user.email}</div>
            <div>Role: {user.role}</div>
        </div>
    );
};
export default AdminDashboard;
