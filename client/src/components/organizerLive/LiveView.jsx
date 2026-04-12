import { Zap, Pause, Play, ChevronRight, Timer, Users, Trophy, Activity } from 'lucide-react';
import AnswerDistributionCard from '../quizRoom/AnswerDistributionCard';
import SubHeader from '../layout/SubHeader';
import { buttonStyles } from '../../styles/buttonStyles';
import ErrorState from '../common/ErrorState';

const LiveView = ({ activeQuiz, joinCode, currentQuestion, timeLeft, answerStats, fastestUser, participants, leaderboard, isPaused, realtimeError, onPause, onResume, onNext, onAbort }) => {
    const isManual = activeQuiz?.mode === 'teaching' || activeQuiz?.mode === 'tutor';
    const currentIndex = (currentQuestion?.index || 0) + 1;
    const totalQuestions = activeQuiz?.questions?.length || 0;
    const progressPercent = totalQuestions > 0 ? Math.min(100, Math.max(0, (currentIndex / totalQuestions) * 100)) : 0;
    const timeLimit = currentQuestion?.timeLimit || 30;
    const timePercent = Math.min(100, Math.max(0, (timeLeft / timeLimit) * 100));
    const effectiveJoinCode = joinCode || activeQuiz?.activeSessionCode || activeQuiz?.roomCode;

    return (
        <div className="app-page relative mx-auto max-w-6xl space-y-6 animate-in fade-in duration-300">
            {isPaused && (
                <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl bg-slate-900/45 backdrop-blur-sm">
                    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xl animate-in zoom-in duration-300">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                            <Pause size={32} />
                        </div>
                        <h2 className="text-xl font-black text-slate-900">Quiz Paused</h2>
                        <button onClick={onResume} className={`${buttonStyles.primary} rounded-xl px-6 py-2.5 text-sm font-semibold`}>
                            Resume Now
                        </button>
                    </div>
                </div>
            )}

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
                                className={`${buttonStyles.primary} inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600`}
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
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-bold text-gray-500">Session code</p>
                    <p className="mt-1 text-sm font-black tracking-wider text-gray-900">{effectiveJoinCode}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-bold text-gray-500">Mode</p>
                    <p className="mt-1 text-sm font-black tracking-wider text-gray-900">{activeQuiz?.mode || 'auto'}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-bold text-gray-500">Participants</p>
                    <p className="mt-1 text-sm font-black tracking-wider text-gray-900">{participants.length}</p>
                </div>
            </section>

            {realtimeError ? (
                <ErrorState
                    title="Realtime sync issue"
                    message={realtimeError}
                />
            ) : null}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs font-bold text-indigo-600">Current question</p>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">#{currentIndex}</span>
                        </div>
                        <p className="text-lg font-semibold leading-snug text-gray-900 md:text-xl">
                            {currentQuestion?.text || 'Waiting for question...'}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="mb-2 flex items-center justify-between">
                                <p className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                                    <Timer size={13} /> Time remaining
                                </p>
                                <span className={`text-sm font-black ${timeLeft < 10 ? 'text-red-500' : 'text-indigo-600'}`}>{timeLeft}s</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                <div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${timePercent}%` }} />
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="mb-2 flex items-center justify-between">
                                <p className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                                    <Activity size={13} /> Progress
                                </p>
                                <span className="text-sm font-black text-indigo-600">{currentIndex} / {totalQuestions}</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                <div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${progressPercent}%` }} />
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

                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="inline-flex items-center gap-1 text-xs font-bold text-gray-500">
                            <Trophy size={13} /> Live leaderboard
                        </h3>
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700 inline-flex items-center gap-1">
                            <Users size={12} /> {participants.length}
                        </span>
                    </div>

                    <div className="space-y-2">
                        {leaderboard.map((player, i) => (
                            <div
                                key={player.name || i}
                                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 animate-in slide-in-from-right"
                                style={{ animationDelay: `${i * 40}ms` }}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xs font-black text-slate-400">#{i + 1}</span>
                                    <span className="truncate text-sm font-semibold text-slate-900">{player.name}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-indigo-600 leading-none">{player.score}</p>
                                    <p className="text-[11px] font-semibold text-slate-400">{player.time?.toFixed?.(1) || 0}s</p>
                                </div>
                            </div>
                        ))}

                        {leaderboard.length === 0 && (
                            <p className="rounded-lg border border-gray-100 bg-gray-50 py-6 text-center text-xs font-bold text-gray-400">
                                Tracking progress...
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveView;
