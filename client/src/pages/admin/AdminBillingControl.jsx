import { useEffect, useState } from 'react';
import { getTotalRevenue } from '../../services/api'; // Replace with real billing API

const AdminBillingControl = () => {
	const [revenue, setRevenue] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		// TODO: Replace with real billing API
		getTotalRevenue([])
			.then(setRevenue)
			.catch(() => setError('Failed to load revenue'))
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <div>Loading billing info...</div>;
	if (error) return <div>{error}</div>;
	if (!revenue) return <div>No revenue data found.</div>;

	return (
		<div>
			<h1>Billing Control</h1>
			<pre>{JSON.stringify(revenue, null, 2)}</pre>
		</div>
	);
};
export default AdminBillingControl;
