import { useEffect, useState } from 'react';
import { getUserHistory } from '../../services/api';

const ParticipantHistoryPage = () => {
	const [history, setHistory] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		getUserHistory()
			.then(setHistory)
			.catch(() => setError('Failed to load history'))
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <div>Loading history...</div>;
	if (error) return <div>{error}</div>;

	return (
		<div>
			<h1>Quiz History</h1>
			{history.length === 0 ? (
				<div>No history found.</div>
			) : (
				<ul>
					{history.map(h => (
						<li key={h._id || h.id}>{h.quizTitle || h.title} - Score: {h.score ?? 'N/A'}</li>
					))}
				</ul>
			)}
		</div>
	);
};
export default ParticipantHistoryPage;
