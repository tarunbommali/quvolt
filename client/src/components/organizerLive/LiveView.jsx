import { Zap, Pause, Play, ChevronRight, Timer, Users, Trophy, Activity } from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import AnswerDistributionCard from '../quizRoom/AnswerDistributionCard';
import SubHeader from '../layout/SubHeader';
import { LivePulseBadge } from '../ui';
import { buttonStyles } from '../../styles/buttonStyles';
import ErrorState from '../common/ErrorState';
import { motionTokens } from '../../design';

const LiveView = ({ activeQuiz, sessionMode, joinCode, currentQuestion, timeLeft, answerStats, fastestUser, participants, leaderboard, isPaused, realtimeError, onPause, onResume, onNext, onAbort }) => {
    // sessionMode is the server-authoritative mode ('auto' | 'tutor').
    // Fall back to activeQuiz.mode for backward compatibility.
    const resolvedMode = sessionMode || activeQuiz?.mode || 'auto';
    const isManual = resolvedMode === 'tutor' || resolvedMode === 'teaching';
    const modeLabel = isManual ? 'Tutor (Manual)' : 'Auto Time';
    const currentIndex = (currentQuestion?.index || 0) + 1;
    const totalQuestions = activeQuiz?.questions?.length || 0;
    const progressPercent = totalQuestions > 0 ? Math.min(100, Math.max(0, (currentIndex / totalQuestions) * 100)) : 0;
    const timeLimit = currentQuestion?.timeLimit || 30;
    const timePercent = Math.min(100, Math.max(0, (timeLeft / timeLimit) * 100));
    const effectiveJoinCode = joinCode || activeQuiz?.activeSessionCode || activeQuiz?.roomCode;

    return (
        <div className="app-page relative mx-auto max-w-6xl space-y-6 animate-in fade-in duration-300">
            <SubHeader
                title="Host Console"
                subtitle={`Control real-time flow for ${activeQuiz?.title || 'this quiz'}`}
                breadcrumbs={[
                    { label: 'Studio', href: '/studio' },
                    { label: activeQuiz?.title || 'Quiz' },
                    { label: 'Host Console' },
                ]}
                actions={(
                    <div className="flex flex-wrap items-center gap-2">
                        {isManual && (
                            <button
                                onClick={onNext}
                                disabled={isPaused}
                                className={`${buttonStyles.primary} inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                                Next <ChevronRight size={14} />
                            </button>
                        )}

                        {!isPaused ? (
                            <button
                                onClick={onPause}
                                className={`${buttonStyles.secondary} inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold`}
                            >
                                <Pause size={14} /> Pause
                            </button>
                        ) : (
                            <button
                                onClick={onResume}
                                className={`${buttonStyles.primary} theme-status-warning inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold`}
                            >
                                <Play size={14} /> Resume
                            </button>
                        )}

                        <button
                            onClick={onAbort}
                            className={`${buttonStyles.danger} rounded-lg px-3 py-1.5 text-xs font-bold`}
                        >
                            End Session
                        </button>
                    </div>
                )}
            />

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Motion.div
                    initial={motionTokens.fadeUp.hidden}
                    animate={motionTokens.fadeUp.visible}
                    transition={motionTokens.transition.smooth}
                    className="rounded-xl theme-surface px-4 py-3"
                >
                    <p className="text-[11px] font-bold theme-text-muted">Session code</p>
                    <p className="mt-1 text-sm font-black tracking-wider theme-text-primary">{effectiveJoinCode}</p>
                </Motion.div>
                <Motion.div
                    initial={motionTokens.fadeUp.hidden}
                    animate={motionTokens.fadeUp.visible}
                    transition={motionTokens.transition.smooth}
                    className="rounded-xl theme-surface px-4 py-3"
                >
                    <p className="text-[11px] font-bold theme-text-muted">Mode</p>
                    <p className="mt-1 text-sm font-black tracking-wider theme-text-primary">{modeLabel}</p>
                </Motion.div>
                <Motion.div
                    initial={motionTokens.fadeUp.hidden}
                    animate={motionTokens.fadeUp.visible}
                    transition={motionTokens.transition.smooth}
                    className="rounded-xl theme-surface px-4 py-3"
                >
                    <p className="text-[11px] font-bold theme-text-muted">Participants</p>
                    <p className="mt-1 text-sm font-black tracking-wider theme-text-primary">{participants.length}</p>
                    <div className="mt-2">
                        <LivePulseBadge count={participants.length} label="users live" />
                    </div>
                </Motion.div>
            </section>

            {realtimeError ? (
                <ErrorState
                    title="Realtime sync issue"
                    message={realtimeError}
                />
            ) : null}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    <div className="rounded-xl theme-surface p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs font-bold text-(--qb-primary)">Current question</p>
                            <span className="rounded-full theme-surface-soft px-2 py-0.5 text-[11px] font-bold theme-text-secondary">#{currentIndex}</span>
                        </div>
                        <p className="text-lg font-semibold leading-snug theme-text-primary md:text-xl">
                            {currentQuestion?.text || 'Waiting for question...'}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {/* Time remaining — only shown in auto mode */}
                        {!isManual && (
                        <div className="rounded-xl theme-surface p-4">
                            <div className="mb-2 flex items-center justify-between">
                                <p className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider theme-text-muted">
                                    <Timer size={13} /> Time remaining
                                </p>
                                <span className={`text-sm font-black ${timeLeft < 10 ? 'theme-tone-danger' : 'text-(--qb-primary)'}`}>{timeLeft}s</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full theme-surface-soft">
                                <div className="h-full bg-(--qb-primary) transition-all duration-700" style={{ width: `${timePercent}%` }} />
                            </div>
                        </div>
                        )}

                        {/* In tutor mode, show a message instead */}
                        {isManual && (
                        <div className="rounded-xl theme-surface p-4 flex items-center gap-2">
                            <ChevronRight size={16} className="text-(--qb-primary) shrink-0" />
                            <p className="text-xs font-semibold theme-text-secondary">
                                Click <span className="font-bold theme-text-primary">Next</span> in the toolbar to advance to the next question.
                            </p>
                        </div>
                        )}

                        <div className="rounded-xl theme-surface p-4">
                            <div className="mb-2 flex items-center justify-between">
                                <p className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider theme-text-muted">
                                    <Activity size={13} /> Progress
                                </p>
                                <span className="text-sm font-black text-(--qb-primary)">{currentIndex} / {totalQuestions}</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full theme-surface-soft">
                                <div className="h-full bg-(--qb-primary) transition-all duration-700" style={{ width: `${progressPercent}%` }} />
                            </div>
                        </div>
                    </div>

                    <AnswerDistributionCard
                        currentQuestion={currentQuestion}
                        answerStats={answerStats}
                        fastestUser={fastestUser}
                        participantCount={participants.length}
                    />
                </div>

                <Motion.div
                    initial={motionTokens.fadeUp.hidden}
                    animate={motionTokens.fadeUp.visible}
                    transition={motionTokens.transition.smooth}
                    className="rounded-xl theme-surface p-4"
                >
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="inline-flex items-center gap-1 text-xs font-bold theme-text-muted">
                            <Trophy size={13} /> Live leaderboard
                        </h3>
                        <span className="rounded-full bg-[color-mix(in_srgb,var(--qb-primary)_16%,var(--qb-surface-1))] px-2 py-0.5 text-xs font-bold text-(--qb-primary) inline-flex items-center gap-1">
                            <Users size={12} /> {participants.length}
                        </span>
                    </div>

                    <div className="space-y-2">
                        {leaderboard.map((player, i) => (
                            <Motion.div
                                key={player.name || i}
                                className="flex items-center justify-between rounded-lg border theme-border theme-surface-soft px-3 py-2 theme-interactive hover:theme-surface animate-in slide-in-from-right"
                                style={{ animationDelay: `${i * 40}ms` }}
                                initial={motionTokens.fadeIn.hidden}
                                animate={motionTokens.fadeIn.visible}
                                transition={{ ...motionTokens.transition.snappy, delay: i * 0.03 }}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xs font-black theme-text-muted">#{i + 1}</span>
                                    <span className="truncate text-sm font-semibold theme-text-primary">{player.name}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-(--qb-primary) leading-none">{player.score}</p>
                                    <p className="text-[11px] font-semibold theme-text-muted">{player.time?.toFixed?.(1) || 0}s</p>
                                </div>
                            </Motion.div>
                        ))}

                        {leaderboard.length === 0 && (
                            <p className="rounded-lg border theme-border theme-surface-soft py-6 text-center text-xs font-bold theme-text-muted">
                                Tracking progress...
                            </p>
                        )}
                    </div>
                </Motion.div>
            </div>
        </div>
    );
};

export default LiveView;
