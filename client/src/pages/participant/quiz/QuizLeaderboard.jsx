import React from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Shell, CenterCard, Card, Stat, Label } from './QuizLayouts';

const QuizLeaderboard = ({ leaderboard = [], user }) => {
    const navigate = useNavigate();
    const myEntry = leaderboard.find(l => l.userId === user?._id || l.name === user?.name);
    const totalScore = myEntry?.score || 0;
    const myRank = leaderboard.findIndex(l => l.userId === user?._id || l.name === user?.name) + 1;

    return (
        <Shell>
            <CenterCard>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                >
                    <Card className="text-center space-y-6 pt-10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-2 bg-[var(--qb-primary)]" />

                        <div className="w-20 h-20 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
                            <Trophy size={40} />
                        </div>

                        <div>
                            <h2 className="text-2xl font-black theme-text-primary">Quiz Completed!</h2>
                            <p className="text-sm theme-text-secondary mt-1 font-medium">You've reached the finish line.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 py-4 border-y theme-border">
                            <Stat label="Your Rank" value={myRank > 0 ? `#${myRank}` : '—'} accent="text-amber-500" />
                            <Stat label="Final Score" value={totalScore} accent="text-indigo-600" />
                        </div>

                        <button
                            onClick={() => navigate('/p/dashboard')}
                            className="w-full h-12 rounded-xl bg-[var(--qb-surface-3)] hover:bg-[var(--qb-surface-4)] theme-text-primary text-sm font-bold transition-all border theme-border"
                        >
                            Back to Dashboard
                        </button>
                    </Card>

                    {leaderboard.length > 0 && (
                        <Card className="space-y-4">
                            <Label className="px-1">Top Performers</Label>
                            <div className="space-y-2">
                                {leaderboard.slice(0, 3).map((entry, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl theme-surface-soft border theme-border">
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded-lg bg-white/50 flex items-center justify-center text-[10px] font-black theme-text-primary border theme-border">
                                                {idx + 1}
                                            </span>
                                            <span className="text-sm font-black theme-text-primary">{entry.name}</span>
                                        </div>
                                        <span className="text-sm font-black text-indigo-600 tabular-nums">{entry.score}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </motion.div>
            </CenterCard>
        </Shell>
    );
};

export default QuizLeaderboard;
