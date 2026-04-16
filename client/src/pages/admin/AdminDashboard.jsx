import { useEffect, useState } from 'react';
import { getMyProfile } from '../../services/api';

const AdminDashboard = () => {
	const [profile, setProfile] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		getMyProfile()
			.then(setProfile)
			.catch(() => setError('Failed to load admin profile'))
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <div>Loading admin dashboard...</div>;
	if (error) return <div>{error}</div>;
	if (!profile) return <div>No profile found.</div>;

	return (
		<div>
			<h1>Admin Dashboard</h1>
			<div>Name: {profile.name}</div>
			<div>Email: {profile.email}</div>
			<div>Role: {profile.role}</div>
		</div>
	);
};
export default AdminDashboard;
