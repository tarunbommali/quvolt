import { useEffect, useState } from 'react';
import { getMyProfile } from '../../../services/apiClient'; // Replace with real user management API

const AdminUserManagement = () => {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		// TODO: Replace with real user management API
		getMyProfile()
			.then(user => setUsers([user]))
			.catch(() => setError('Failed to load users'))
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <div>Loading users...</div>;
	if (error) return <div>{error}</div>;

	return (
		<div>
			<h1>User Management</h1>
			{users.length === 0 ? (
				<div>No users found.</div>
			) : (
				<ul>
					{users.map(u => (
						<li key={u._id || u.id}>{u.name} - {u.email}</li>
					))}
				</ul>
			)}
		</div>
	);
};
export default AdminUserManagement;

