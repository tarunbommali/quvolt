import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getTemplateSessions } from '../../services/api';
import SubHeader from '../../components/layout/SubHeader';
import HistoryGrid from '../../components/history/HistoryGrid';
import { useAuthStore } from '../../stores/useAuthStore';
import HistoryEmptyState from '../../components/history/HistoryEmptyState';

const TemplateHistoryPage = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    
    const [sessions, setSessions] = useState([]);
    const [templateTitle, setTemplateTitle] = useState(location.state?.quiz?.title || 'Quiz');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchSessions = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getTemplateSessions(id);
            // data is { templateId, templateTitle, sessions }
            setSessions(data.sessions || []);
            setTemplateTitle(data.templateTitle || templateTitle);
        } catch (err) {
            setError('Failed to load session history.');
        } finally {
            setLoading(false);
        }
    }, [id, templateTitle]);

    useEffect(() => {
        if (!id) return;
        fetchSessions();
    }, [id, fetchSessions]);

    if (loading) {
        return (
            <div className="app-page">
                <div className="rounded-3xl border border-gray-100 bg-white p-8 text-center text-sm font-semibold text-slate-500">
                    Loading session history...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="app-page space-y-8">
                <SubHeader
                    title="History Error"
                    subtitle={error}
                    breadcrumbs={[
                        { label: 'Editor', href: `/quiz/templates/${id}` },
                        { label: 'History' }
                    ]}
                />
                <div className="rounded-3xl border border-red-100 bg-red-50 p-8 text-center">
                    <p className="text-sm font-medium text-red-600">{error}</p>
                    <button 
                        onClick={fetchSessions}
                        className="mt-4 text-sm font-bold text-red-700 underline"
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="app-page space-y-8 animate-in fade-in duration-500">
            <SubHeader
                title={`${templateTitle} Sessions`}
                subtitle="History of previous sessions conducted with this template"
                breadcrumbs={[
                    { label: 'Editor', href: `/quiz/templates/${id}` },
                    { label: 'History' }
                ]}
            />

            {sessions.length === 0 ? (
                <HistoryEmptyState 
                    title="No Sessions Conducted"
                    message="You haven't conducted any sessions with this template yet. Once you host a session, it will appear here." 
                />
            ) : (
                <HistoryGrid
                    records={sessions.map(s => ({
                        ...s,
                        title: templateTitle, 
                        quizTitle: templateTitle,
                        date: s.startedAt || s.createdAt,
                    }))}
                    userRole={user?.role || 'host'}
                    onNavigate={(record) => navigate(`/quiz/sessions/${record._id}`, { state: { record } })}
                    onOpenLeaderboard={(e) => e.stopPropagation()} 
                    onPrefetch={() => {}} 
                />
            )}
        </div>
    );
};

export default TemplateHistoryPage;
