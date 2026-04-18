import { useState, useEffect, useMemo } from 'react';
import { Play, Zap, CalendarClock, Clock, Copy, Check } from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import SubHeader from '../../layout/SubHeader';
import { LivePulseBadge } from '../ui';
import { buttonStyles } from '../../../styles/buttonStyles';
import ErrorState from '../common/ErrorState';
import { motionTokens } from '../../../design';

// Formats ms remaining into HH:MM:SS
const formatCountdown = (ms) => {
    if (ms <= 0) return '00:00:00';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
};

const LiveLobby = ({ activeQuiz, joinCode, participants, startQuizBroadcast, showToast, onAbort, realtimeError }) => {
    const scheduledAt = activeQuiz?.scheduledAt;
    const isScheduled = !!scheduledAt;
    const scheduledDate = useMemo(() => (scheduledAt ? new Date(scheduledAt) : null), [scheduledAt]);
    const displayedCode = joinCode || activeQuiz?.activeSessionCode || activeQuiz?.roomCode;

    const joinUrl = `${window.location.origin}/quiz/${displayedCode}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}&bgcolor=e0e7ff&color=4f46e5&margin=10`;

    const [copied, setCopied] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const [now, setNow] = useState(0);

    const countdown = useMemo(() => {
        if (!isScheduled || !scheduledDate) return 0;
        return scheduledDate.getTime() - now;
    }, [isScheduled, scheduledDate, now]);

    const canLaunch = !isScheduled || countdown <= 0;

    // Countdown timer for scheduled sessions
    useEffect(() => {
        if (!isScheduled || !scheduledDate) return undefined;

        const id = setInterval(tick, 1000);

        function tick() {
            setNow(Date.now());
        }

        return () => clearInterval(id);
    }, [isScheduled, scheduledDate]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(joinUrl);
        setCopied(true);
        showToast('Link copied!', 'success');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(displayedCode);
        setCopiedCode(true);
        showToast('Code copied!', 'success');
        setTimeout(() => setCopiedCode(false), 2000);
    };

    return (
        <div className="app-page mx-auto  space-y-6 animate-in fade-in duration-300">
            <SubHeader
                title="Invite Room"
                subtitle={`Active: ${activeQuiz.title}`}
                breadcrumbs={[
                    { label: 'Studio', href: '/studio' },
                    { label: activeQuiz.title },
                    { label: 'Invite Room' },
                ]}
                actions={(
                    <button
                        type="button"
                        onClick={onAbort}
                        className={`${buttonStyles.danger} rounded-xl px-4 py-2 text-xs font-bold`}
                    >
                        Abort
                    </button>
                )}
            />

            <section className="space-y-4">
                {realtimeError ? (
                    <ErrorState
                        title="Realtime sync issue"
                        message={realtimeError}
                    />
                ) : null}

                {isScheduled && scheduledDate && !canLaunch && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 px-5 py-4">
                        <div className="flex items-center gap-3">
                            <span className="rounded-lg bg-violet-100 p-2 text-violet-700">
                                <Clock size={16} />
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-violet-900">Scheduled Session</p>
                                <p className="text-xs text-violet-700">
                                    Starts at {scheduledDate.toLocaleString('en-IN', {
                                        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                                    })}
                                </p>
                            </div>
                        </div>
                        <p className="text-lg font-black tracking-wide text-violet-700 tabular-nums">{formatCountdown(countdown)}</p>
                    </div>
                )}

                <Motion.div
                    initial={motionTokens.fadeUp.hidden}
                    animate={motionTokens.fadeUp.visible}
                    transition={motionTokens.transition.smooth}
                    className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4"
                >
                    <div className="space-y-2">
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-gray-500">{isScheduled ? 'Permanent code' : 'Live session code'}</p>
                            <p className="text-xl font-black tracking-widest text-gray-900">{displayedCode}</p>
                        </div>
                        <div>
                            <LivePulseBadge count={participants.length} label="users connected" />
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleCopyCode}
                        className={`${buttonStyles.secondary} rounded-lg px-3 py-1.5 text-sm font-semibold`}
                    >
                        {copiedCode ? 'Copied' : 'Copy Code'}
                    </button>
                </Motion.div>

                <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-gray-500">Join link</p>
                        <p className="max-w-2xl truncate text-sm font-medium text-gray-700">{joinUrl}</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleCopyLink}
                        className={`${buttonStyles.secondary} rounded-lg px-3 py-1.5 text-sm font-semibold`}
                    >
                        {copied ? 'Copied' : 'Copy Link'}
                    </button>
                </div>

                <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                            <Play size={16} className="fill-indigo-600" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-gray-900">Start Quiz Session</p>
                            <p className="text-sm text-gray-500">Launch the room for participants and begin real-time flow</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={startQuizBroadcast}
                        disabled={isScheduled && !canLaunch}
                        className={`${buttonStyles.primary} rounded-lg px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                        Launch Session
                    </button>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <h3 className="text-xs font-bold text-gray-500">Join QR</h3>
                    <div className="mt-3 flex flex-col items-center gap-3">
                        <img src={qrUrl} alt="Quiz QR Code" className="h-48 w-48 rounded-xl border border-gray-100" />
                        <p className="text-xs text-gray-500">Scan to join with code {displayedCode}</p>
                    </div>
                </div>

                <Motion.div
                    initial={motionTokens.fadeUp.hidden}
                    animate={motionTokens.fadeUp.visible}
                    transition={motionTokens.transition.smooth}
                    className="rounded-xl border border-gray-200 bg-white p-4"
                >
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-xs font-bold text-gray-500">Participants</h3>
                            <p className="mt-1 text-[11px] font-semibold text-slate-400">Connected: {participants.length}</p>
                        </div>
                        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">{participants.length}</span>
                    </div>

                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                        {participants.map((p, i) => (
                            <Motion.div
                                initial={motionTokens.fadeUp.hidden}
                                animate={motionTokens.fadeUp.visible}
                                transition={{ ...motionTokens.transition.snappy, delay: i * 0.03 }}
                                key={p._id || i}
                                className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800"
                            >
                                <span className="h-2 w-2 rounded-full bg-green-500" />
                                {p.name}
                            </Motion.div>
                        ))}

                        {participants.length === 0 && (
                            <div className="py-8 text-center text-xs font-semibold text-gray-400">
                                Waiting for participants...
                            </div>
                        )}
                    </div>
                </Motion.div>
            </section>
        </div>
    );
};

export default LiveLobby;
