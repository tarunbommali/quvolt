import { useEffect, useState } from 'react';
import { getQuizAnalytics } from '../../../services/apiClient'; // Replace with real system analytics API

const AdminSystemAnalytics = () => {
	const [analytics, setAnalytics] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		// TODO: Replace with real system analytics API
		getQuizAnalytics('demo-quiz-id')
			.then(setAnalytics)
			.catch(() => setError('Failed to load analytics'))
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <div>Loading analytics...</div>;
	if (error) return <div>{error}</div>;
	if (!analytics) return <div>No analytics found.</div>;

	return (
		<div>
			<h1>System Analytics</h1>
			<pre>{JSON.stringify(analytics, null, 2)}</pre>
		</div>
	);
};
export default AdminSystemAnalytics;

