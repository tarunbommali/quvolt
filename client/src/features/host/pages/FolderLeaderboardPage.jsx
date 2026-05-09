import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Trophy, Users, BarChart3, Filter, Download, Layout, Table as TableIcon } from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import axios from 'axios';

import ScoreTable from '../components/ScoreTable';
import { buildScoreMatrix } from '../utils/buildScoreMatrix';
import LoadingScreen from '../../../components/common/LoadingScreen';
import BreadCrumbs from '../../../components/layout/BreadCrumbs';
import { cx, layout, buttonStyles, typography } from '../../../styles/index';
import useToast from '../../../hooks/useToast';

const FolderLeaderboardPage = () => {
    const { folderId } = useParams(); // This could be a quizId or folderId
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [viewMode, setViewMode] = useState('unit'); // 'default' | 'unit'
    const [error, setError] = useState(null);

    const folderTitle = location.state?.folderTitle || 'Analytics';

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                
                // 1. Fetch latest session for this target
                const sessionResponse = await axios.get(`/api/blitz/target/${folderId}`);
                const session = sessionResponse.data.data;

                // 2. Fetch Leaderboard for this session
                const mode = session.type === 'folder' ? 'folder' : 'single';
                const response = await axios.get(`/api/blitz/${session._id}/leaderboard?mode=${mode}`);
                
                // 3. Fetch Dynamic Children (Units)
                const childrenResponse = await axios.get(`/api/blitz/folder/${folderId}/children`);
                const units = childrenResponse.data.data || [];

                setData({
                    leaderboard: response.data.data,
                    units: units.length > 0 ? units : (session.type === 'single' ? [{ _id: session.quizId, title: folderTitle }] : []),
                    session: session
                });

                // Auto-set view mode based on template settings
                if (session?.templateConfig?.leaderboard?.groupBy === 'unit') {
                    setViewMode('unit');
                } else if (session.type === 'single') {
                    setViewMode('default');
                }
            } catch (err) {
                console.error('Failed to fetch analytics:', err);
                setError('No active blitz sessions found for this item.');
                showToast(err.response?.data?.message || 'Could not load analytics', 'error');
            } finally {
                setLoading(false);
            }
        };

        if (folderId) fetchData();
    }, [folderId, showToast]);

    const matrixData = useMemo(() => {
        if (!data) return [];
        return buildScoreMatrix(data.leaderboard, data.units);
    }, [data]);

    if (loading) return <LoadingScreen />;

    if (error) {
        return (
            <div className={cx(layout.page, "flex flex-col items-center justify-center min-h-[60vh] text-center")}>
                <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 mb-6">
                    <Trophy size={40} />
                </div>
                <h1 className={typography.h1}>No Blitz Data</h1>
                <p className={cx(typography.body, "mt-2 max-w-sm mx-auto")}>
                    {error} Start a Blitz session first to see participant performance here.
                </p>
                <button 
                    onClick={() => navigate(-1)}
                    className={cx(buttonStyles.primary, "mt-8")}
                >
                    Go Back
                </button>
            </div>
        );
    }

    // Breadcrumbs
    const breadcrumbs = [
        { label: 'Workspace', href: '/workspace' },
        { label: folderTitle, href: data?.session?.type === 'folder' ? `/workspace/collection/${folderId}` : `/studio` },
        { label: 'Scorecard' }
    ];

    // Header Actions
    const actions = (
        <>
            <div className="flex items-center gap-2 mr-4">
                <span className={typography.micro}>Group By:</span>
                <div className="flex items-center bg-gray-100 dark:bg-white/5 p-1 rounded-xl border theme-border shadow-sm">
                    {['none', 'immediate', 'full'].map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode === 'none' ? 'default' : 'unit')}
                            className={cx(
                                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                (mode === 'none' && viewMode === 'default') || (mode === 'immediate' && viewMode === 'unit')
                                    ? "bg-white dark:bg-white/10 theme-text-primary shadow-sm"
                                    : "theme-text-muted hover:theme-text-primary"
                            )}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </div>
            
            <button className={cx(buttonStyles.secondary, "!p-2.5 rounded-xl")}>
                <Download size={18} />
            </button>
        </>
    );

    return (
        <div className={cx(layout.page, "animate-in fade-in duration-500")}>
            <BreadCrumbs
                breadcrumbs={breadcrumbs}
                actions={actions}
            />

            {/* Stats Overview */}
            <div className={layout.metricGrid3}>
                <div className="p-6 rounded-2xl border theme-border theme-surface shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                            <Users size={16} />
                        </div>
                        <span className={typography.micro}>Total Participants</span>
                    </div>
                    <p className={typography.metricLg}>{data?.leaderboard?.length || 0}</p>
                </div>
                
                <div className="p-6 rounded-2xl border theme-border theme-surface shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                            <BarChart3 size={16} />
                        </div>
                        <span className={typography.micro}>{data?.session?.type === 'folder' ? 'Units Tracked' : 'Total Questions'}</span>
                    </div>
                    <p className={typography.metricLg}>{data?.session?.type === 'folder' ? data?.units?.length : (data?.units[0]?.questions?.length || 0)}</p>
                </div>

                <div className="p-6 rounded-2xl border theme-border theme-surface shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                            <Trophy size={16} />
                        </div>
                        <span className={typography.micro}>Avg. Completion</span>
                    </div>
                    <p className={typography.metricLg}>78%</p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className={layout.sectionLg}>
                <div className="flex items-center justify-between border-b theme-border pb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-5 bg-indigo-600 rounded-full" />
                        <h2 className={typography.h2}>
                            {viewMode === 'unit' ? 'Mastery Matrix' : 'Participant Ranking'}
                        </h2>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Filter size={14} className="theme-text-muted" />
                        <span className={typography.micro}>Sort by: Total Score</span>
                    </div>
                </div>

                {viewMode === 'unit' ? (
                    <ScoreTable data={matrixData} units={data?.units || []} />
                ) : (
                    <div className={layout.stackTight}>
                        {matrixData.map((user, idx) => (
                            <div key={user.userId} className="p-4 rounded-xl border theme-border theme-surface flex items-center justify-between group hover:border-indigo-500/30 transition-all shadow-sm">
                                <div className="flex items-center gap-4">
                                    <span className="w-6 text-xs font-semibold theme-text-muted">{idx + 1}</span>
                                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold uppercase text-xs">
                                        {user.name?.charAt(0) || user.email?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className={typography.bodyStrong}>{user.name || 'Anonymous'}</p>
                                        <p className={typography.micro}>{user.email}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={typography.metricSm}>{user.total}</p>
                                    <p className={typography.micro}>Points</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FolderLeaderboardPage;
