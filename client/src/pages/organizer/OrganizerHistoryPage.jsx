import { useEffect, useState } from 'react';
import { getOrganizerHistory } from '../../services/api';

const OrganizerHistoryPage = () => {
	const [history, setHistory] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		getOrganizerHistory()
			.then(setHistory)
			.catch(() => setError('Failed to load history'))
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <div>Loading organizer history...</div>;
	if (error) return <div>{error}</div>;

	return (
		<div>
			<h1>Organizer Quiz History</h1>
			{history.length === 0 ? (
				<div>No history found.</div>
			) : (
				<ul>
					{history.map(h => (
						<li key={h._id || h.id}>{h.quizTitle || h.title} - Sessions: {h.sessionCount ?? 'N/A'}</li>
					))}
				</ul>
			)}
		</div>
	);
};
export default OrganizerHistoryPage;
