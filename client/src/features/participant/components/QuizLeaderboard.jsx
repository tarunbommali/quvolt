import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Shell, CenterCard, Stat } from './QuizLayouts';
import { useQuizRealtimeStore } from '../../../stores/quiz/useQuizRealtimeStore';
import { cards, typography, buttonStyles, layout, cx } from '../../../styles/index';

const QuizLeaderboard = ({ leaderboard = [], user }) => {
    const navigate = useNavigate();
    const sessionId = useQuizRealtimeStore(s => s.sessionId);
    const myEntry = leaderboard.find(l => l.userId === user?._id || l.name === user?.name);
    const totalScore = myEntry?.score || 0;
    const myRank = leaderboard.findIndex(l => l.userId === user?._id || l.name === user?.name) + 1;

    return (
        <Shell>
            <CenterCard>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                >
                    <div className={cx(cards.elevated, "text-center space-y-6 pt-10 relative overflow-hidden")}>
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--qb-primary)]" />

                        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-500 flex items-center justify-center mx-auto shadow-sm">
                            <Trophy size={32} />
                        </div>

                        <div className="space-y-1">
                            <h2 className={typography.h2}>Quiz Completed!</h2>
                            <p className={typography.body}>You've reached the finish line.</p>
                        </div>

                        <div className={cx(cards.divider, "grid grid-cols-2 gap-4 py-4 mt-2")}>
                            <Stat label="Your Rank" value={myRank > 0 ? `#${myRank}` : '—'} accent="text-amber-600 dark:text-amber-500" />
                            <Stat label="Final Score" value={totalScore} accent="text-[var(--qb-primary)]" />
                        </div>

                        <div className="flex gap-3">
                            {sessionId && (
                                <button
                                    onClick={() => navigate(`/p/analysis/${sessionId}`)}
                                    className={cx(buttonStyles.base, buttonStyles.primary, buttonStyles.sizeLg, "flex-1 justify-center")}
                                >
                                    <BarChart3 size={16} /> View Analysis
                                </button>
                            )}
                            <button
                                onClick={() => navigate('/p/history')}
                                className={cx(buttonStyles.base, buttonStyles.secondary, buttonStyles.sizeLg, "flex-1 justify-center")}
                            >
                                Quiz History
                            </button>
                        </div>
                    </div>

                    {leaderboard.length > 0 && (
                        <div className={cx(cards.default, "space-y-4")}>
                            <p className={cx(typography.metaLabel, "px-1")}>Top Performers</p>
                            <div className="space-y-2">
                                {leaderboard.slice(0, 3).map((entry, idx) => (
                                    <div key={idx} className={cx(cards.flat, layout.rowBetween)}>
                                        <div className={cx(layout.rowStart, "gap-3")}>
                                            <span className="w-6 h-6 rounded-md bg-white/50 dark:bg-black/20 flex items-center justify-center text-xs font-semibold theme-text-primary border theme-border shadow-sm">
                                                {idx + 1}
                                            </span>
                                            <span className={typography.bodyStrong}>{entry.name}</span>
                                        </div>
                                        <span className={cx(typography.metricSm, "text-[var(--qb-primary)]")}>{entry.score}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            </CenterCard>
        </Shell>
    );
};

export default QuizLeaderboard;
