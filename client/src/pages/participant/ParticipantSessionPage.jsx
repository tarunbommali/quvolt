import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getQuizByCode } from '../../services/api';

const ParticipantSessionPage = () => {
	const { code } = useParams();
	const [session, setSession] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (!code) return;
		getQuizByCode(code)
			.then(setSession)
			.catch(() => setError('Failed to load session'))
			.finally(() => setLoading(false));
	}, [code]);

	if (loading) return <div>Loading session...</div>;
	if (error) return <div>{error}</div>;
	if (!session) return <div>No session found.</div>;

	return (
		<div>
			<h1>Session: {session.title}</h1>
			<div>Status: {session.status}</div>
			<div>Host: {session.hostName || session.host || 'N/A'}</div>
			{/* Add more session details as needed */}
		</div>
	);
};
export default ParticipantSessionPage;
