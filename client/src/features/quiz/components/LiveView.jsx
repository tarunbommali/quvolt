import { Zap, Pause, Play, ChevronRight, Timer, Users, Trophy, Activity, AlertCircle } from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import AnswerDistributionCard from './AnswerDistributionCard';
import SubHeader from '../../../components/layout/SubHeader';
import { LivePulseBadge } from '../../../components/common/ui';

import ErrorState from '../../../components/common/ErrorState';
import { typography, layout, buttonStyles, cards, cx } from '../../../styles/index';

const LiveView = ({ activeQuiz, sessionMode, joinCode, currentQuestion, timeLeft, answerStats, fastestUser, participants = [], leaderboard = [], isPaused, realtimeError, onPause, onResume, onNext, onAbort }) => {
    const resolvedMode = sessionMode || activeQuiz?.mode || 'auto';
    const isManual = resolvedMode === 'tutor' || resolvedMode === 'teaching';
    const modeLabel = isManual ? 'Tutor Mode' : 'Automatic Flow';
    const currentIndex = (currentQuestion?.index || 0) + 1;
    const totalQuestions = activeQuiz?.questions?.length || 0;
    const progressPercent = totalQuestions > 0 ? Math.min(100, Math.max(0, (currentIndex / totalQuestions) * 100)) : 0;
    const timeLimit = currentQuestion?.timeLimit || 30;
    const timePercent = Math.min(100, Math.max(0, (timeLeft / timeLimit) * 100));
    const effectiveJoinCode = joinCode || activeQuiz?.activeSessionCode || activeQuiz?.roomCode;

    return (
        <div className={cx(layout.page, "relative min-h-screen pb-20 animate-in fade-in duration-500")}>
            <SubHeader
                title="Creator Control Center"
                subtitle={`Real-time session orchestration for ${activeQuiz?.title}`}
                breadcrumbs={[
                    { label: 'Studio', href: '/studio' },
                    { label: activeQuiz?.title || 'Quiz' },
                    { label: 'Live Console' },
                ]}
                actions={(
                    <div className="flex flex-wrap items-center gap-3">
                        {isManual && (
                            <button
                                onClick={onNext}
                                disabled={isPaused}
                                className={cx(buttonStyles.base, buttonStyles.primary, buttonStyles.sizeMd, "gap-2")}
                            >
                                Next Slide <ChevronRight size={14} />
                            </button>
                        )}

                        {!isPaused ? (
                            <button
                                onClick={onPause}
                                className={cx(buttonStyles.base, buttonStyles.secondary, buttonStyles.sizeMd, "gap-2")}
                            >
                                <Pause size={14} fill="currentColor" /> Freeze Flow
                            </button>
                        ) : (
                            <button
                                onClick={onResume}
                                className={cx(buttonStyles.base, buttonStyles.sizeMd, "bg-amber-500 hover:bg-amber-600 text-white gap-2 shadow-lg shadow-amber-500/20")}
                            >
                                <Play size={14} fill="currentColor" /> Resume Flow
                            </button>
                        )}

                        <button
                            onClick={onAbort}
                            className={cx(buttonStyles.base, buttonStyles.danger, buttonStyles.sizeMd)}
                        >
                            Terminate
                        </button>
                    </div>
                )}
            />

            {realtimeError && (
                <div className="p-6 rounded-[2rem] bg-red-500/10 border-2 border-red-500/20 flex items-start gap-4">
                    <AlertCircle className="text-red-500 shrink-0" size={24} />
                    <div>
                        <p className={typography.eyebrow + " !text-red-500"}>Real-time sync issue</p>
                        <p className={typography.small + " text-red-500/70 mt-1"}>{realtimeError}</p>
                    </div>
                </div>
            )}

            {/* Top Insight Bar */}
            <section className="grid grid-cols-1 gap-6 sm:grid-cols-4">
                {[
                    { label: 'Session ID', value: effectiveJoinCode, icon: Zap, tone: 'text-indigo-500' },
                    { label: 'Flow Engine', value: modeLabel, icon: Activity, tone: 'text-purple-500' },
                    { label: 'Live Roster', value: `${participants.length} Connects`, icon: Users, tone: 'text-emerald-500' },
                    { label: 'Session Status', value: isPaused ? 'PAUSED' : 'LIVE', icon: Play, tone: isPaused ? 'text-amber-500' : 'text-emerald-500' }
                ].map((stat, i) => (
                    <Motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={cx(cards.base, "!p-6 !rounded-[2rem] flex items-center gap-5")}
                    >
                        <div className={`w-12 h-12 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center ${stat.tone}`}>
                            <stat.icon size={20} fill={i === 3 && !isPaused ? "currentColor" : "none"} />
                        </div>
                        <div className="min-w-0">
                            <p className={typography.micro}>{stat.label}</p>
                            <p className={cx(typography.bodyStrong, "truncate")}>{stat.value}</p>
                        </div>
                    </Motion.div>
                ))}
            </section>

            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
                <div className="space-y-10 lg:col-span-8">
                    {/* Active Question Canvas */}
                    <div className={cx(cards.elevated, "!p-10 !rounded-[3rem] relative overflow-hidden bg-gradient-to-br from-white to-indigo-50/10 dark:from-gray-900 dark:to-indigo-500/5")}>
                        <div className="flex items-center justify-between mb-10">
                            {/* Question intel*/}
                            <span className={typography.micro}>Question {currentIndex} of {totalQuestions}</span>

                            {/* Timer intel*/}
                            <span className={cx(typography.metricSm, timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-indigo-500')}>{timeLeft}s</span>

                        </div>
                        <h2 className={typography.metricMd}>
                            {currentQuestion?.text || 'Establishing connection to session...'}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">

                        {isManual && (
                            <div className={cx(cards.base, "!p-8 !rounded-[2.5rem] bg-amber-500/[0.03] border-amber-500/20 flex flex-col justify-center items-center text-center space-y-4")}>
                                <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                    <ChevronRight size={24} />
                                </div>
                                <p className={cx(typography.small, "theme-text-secondary px-4 leading-relaxed")}>
                                    Manual flow control active. Use <span className="text-amber-600 font-bold">Next Slide</span> to progress.
                                </p>
                            </div>
                        )}

                    </div>

                    <AnswerDistributionCard
                        currentQuestion={currentQuestion}
                        answerStats={answerStats}
                        fastestUser={fastestUser}
                        participantCount={participants.length}
                    />
                </div>

                <div className="lg:col-span-4 space-y-8">
                    {/* Live Leaderboard */}
                    <Motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cx(cards.base, "!p-10 !rounded-[3rem] h-fit min-h-[600px] flex flex-col shadow-2xl shadow-indigo-500/5")}
                    >
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-3">
                                <Trophy size={20} className="text-amber-500" />
                                <h3 className={typography.h3}>Competitive Matrix</h3>
                            </div>
                            <div className={cx(typography.micro, "px-3 py-1 rounded-lg bg-gray-100 dark:bg-white/5 border theme-border")}>
                                Top {leaderboard.length}
                            </div>
                        </div>

                        <div className="flex-1 space-y-3 custom-scrollbar">
                            {leaderboard.map((player, i) => (
                                <Motion.div
                                    key={player.name || i}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-300 ${i === 0 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-gray-50 dark:bg-white/5 border-transparent hover:border-indigo-500/20'
                                        }`}
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className={cx(
                                            "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs",
                                            i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-slate-300 text-slate-700' : i === 2 ? 'bg-amber-700/60 text-white' : 'bg-gray-200 dark:bg-white/10 theme-text-muted'
                                        )}>
                                            {i + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={typography.bodyStrong + " truncate"}>{player.name}</p>
                                            <p className={typography.micro + " !tracking-normal"}>{player.time?.toFixed(1) || 0}s Velocity</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={cx(typography.metricSm, i === 0 ? 'text-amber-500' : 'text-indigo-500')}>
                                            {player.score.toLocaleString()}
                                        </p>
                                        <p className={typography.micro}>Intelligence</p>
                                    </div>
                                </Motion.div>
                            ))}

                            {leaderboard.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
                                    <Activity size={40} className="text-slate-300 animate-pulse" />
                                    <p className="text-xs font-black uppercase tracking-widest theme-text-muted">Establishing Ranks...</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-10 pt-8 border-t theme-border flex items-center gap-3">
                            <Users size={14} className="text-indigo-500" />
                            <p className={typography.micro + " !tracking-normal"}>
                                Real-time connection with {participants.length} active participants
                            </p>
                        </div>
                    </Motion.div>
                </div>
            </div>
        </div>
    );
};

export default LiveView;
