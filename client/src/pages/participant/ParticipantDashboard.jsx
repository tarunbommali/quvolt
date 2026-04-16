import { useEffect, useState } from 'react';
import { getMyQuizzes } from '../../services/api';

const ParticipantDashboard = () => {
	const [quizzes, setQuizzes] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		getMyQuizzes()
			.then(setQuizzes)
			.catch(() => setError('Failed to load quizzes'))
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <div>Loading quizzes...</div>;
	if (error) return <div>{error}</div>;

	return (
		<div>
			<h1>My Quizzes</h1>
			{quizzes.length === 0 ? (
				<div>No quizzes found.</div>
			) : (
				<ul>
					{quizzes.map(q => (
						<li key={q._id || q.id}>{q.title}</li>
					))}
				</ul>
			)}
		</div>
	);
};
export default ParticipantDashboard;
