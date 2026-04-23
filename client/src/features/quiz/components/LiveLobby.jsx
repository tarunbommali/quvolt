import { useState, useEffect, useMemo } from 'react';
import { Zap, Clock, Copy, Check, Play, Share2, Users, AlertCircle } from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import SubHeader from '../../layout/SubHeader';
import { LivePulseBadge } from '../ui';
import { cards, typography, buttonStyles, layout, cx } from '../../../styles/index'

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
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}&bgcolor=ffffff&color=4f46e5&margin=10`;

    const [copied, setCopied] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const [now, setNow] = useState(Date.now());

    const countdown = useMemo(() => {
        if (!isScheduled || !scheduledDate) return 0;
        return scheduledDate.getTime() - now;
    }, [isScheduled, scheduledDate, now]);

    const canLaunch = !isScheduled || countdown <= 0;

    useEffect(() => {
        if (!isScheduled || !scheduledDate) return undefined;
        const id = setInterval(() => setNow(Date.now()), 1000);
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
        <div className="app-page mx-auto max-w-5xl space-y-8 animate-in fade-in duration-500">
            <SubHeader
                title="Creator Lobby"
                subtitle={`Preparing session for ${activeQuiz.title}`}
                breadcrumbs={[
                    { label: 'Studio', href: '/studio' },
                    { label: activeQuiz.title },
                    { label: 'Invite Room' },
                ]}
                actions={(
                    <button
                        type="button"
                        onClick={onAbort}
                        className={cx(buttonStyles.base, buttonStyles.danger, buttonStyles.sizeMd)}
                    >
                        Terminate Session
                    </button>
                )}
            />

            <div className="space-y-6">
                {realtimeError && (
                    <div className={cx(cards.flat, "bg-red-50/50 border-red-200 dark:bg-red-900/10 dark:border-red-900/30", layout.rowStart, "items-start gap-3")}>
                        <AlertCircle className="text-red-600 shrink-0" size={20} />
                        <div className="space-y-0.5">
                            <p className={typography.bodyStrong}>Real-time sync issue</p>
                            <p className={typography.small}>{realtimeError}</p>
                        </div>
                    </div>
                )}

                {isScheduled && scheduledDate && !canLaunch && (
                    <Motion.div
                        initial={{ opacity: 0, y: -16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cx(cards.elevated, layout.rowBetween, "flex-col sm:flex-row bg-[var(--qb-primary)]/[0.02] border-[var(--qb-primary)]/20")}
                    >
                        <div className={cx(layout.rowStart, "gap-4")}>
                            <div className="w-12 h-12 rounded-xl theme-surface flex items-center justify-center text-[var(--qb-primary)] shadow-sm border theme-border">
                                <Clock size={24} />
                            </div>
                            <div>
                                <h3 className={typography.h2}>Scheduled Session</h3>
                                <p className={typography.small}>
                                    Live at {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {scheduledDate.toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <p className={typography.metaLabel}>Commencing in</p>
                            <p className={cx(typography.metricLg, "text-[var(--qb-primary)] tabular-nums")}>{formatCountdown(countdown)}</p>
                        </div>
                    </Motion.div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Connection Intel */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* Room Code Card */}
                        <div className={cx(cards.elevated, "group")}>
                            <div className={cx(layout.rowBetween, "mb-6 items-start")}>
                                <div className="space-y-1">
                                    <p className={typography.eyebrow}>
                                        {isScheduled ? 'Permanent Room Code' : 'Live Session ID'}
                                    </p>
                                    <h3 className={cx(typography.display, "tracking-[0.1em] font-bold")}>{displayedCode}</h3>
                                </div>
                                <button
                                    onClick={handleCopyCode}
                                    className={cx(buttonStyles.base, buttonStyles.secondary, buttonStyles.sizeMd, "gap-2")}
                                >
                                    {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                                    {copiedCode ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                            <div className={cx(layout.rowStart, "gap-3")}>
                                <LivePulseBadge count={participants.length} label="Creators Connected" />
                                <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
                                <div className={cx(layout.rowStart, typography.micro, "gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800")}>
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Global Sync Active
                                </div>
                            </div>
                        </div>

                        {/* Join Link Card */}
                        <div className={cx(cards.default, layout.rowBetween, "flex-col sm:flex-row")}>
                            <div className={cx(layout.rowStart, "gap-3 min-w-0 flex-1")}>
                                <div className="w-10 h-10 rounded-xl theme-surface-soft flex items-center justify-center theme-text-muted shrink-0">
                                    <Share2 size={18} />
                                </div>
                                <div className="min-w-0 flex-1 space-y-0.5">
                                    <p className={typography.metaLabel}>Direct Invite URL</p>
                                    <p className={cx(typography.bodyStrong, "truncate")}>{joinUrl}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleCopyLink}
                                className={cx(buttonStyles.base, buttonStyles.secondary, buttonStyles.sizeMd, "mt-4 sm:mt-0 w-full sm:w-auto")}
                            >
                                {copied ? 'Copied' : 'Copy Link'}
                            </button>
                        </div>

                        {/* Launch Action Card */}
                        <div className={cx(cards.elevated, "border-[var(--qb-primary)]/40 shadow-lg shadow-[var(--qb-primary)]/10 bg-[var(--qb-primary)]/[0.02]")}>
                            <div className={cx(layout.rowBetween, "flex-col sm:flex-row gap-6")}>
                                <div className={cx(layout.rowStart, "gap-4")}>
                                    <div className="w-14 h-14 rounded-2xl bg-[var(--qb-primary)] text-white flex items-center justify-center shadow-md shadow-[var(--qb-primary)]/20 shrink-0">
                                        <Play size={24} fill="currentColor" className="ml-1" />
                                    </div>
                                    <div>
                                        <h3 className={typography.h2}>Initiate Sequence</h3>
                                        <p className={typography.small}>Launch the room and begin the real-time interaction flow.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={startQuizBroadcast}
                                    disabled={isScheduled && !canLaunch}
                                    className={cx(buttonStyles.base, buttonStyles.primary, buttonStyles.sizeLg, "gap-2 w-full sm:w-auto")}
                                >
                                    <Zap size={16} fill="currentColor" />
                                    Launch Room
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Visual Access */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* QR Intel */}
                        <div className={cx(cards.elevated, "flex flex-col items-center text-center space-y-5")}>
                            <div>
                                <p className={typography.eyebrow}>Visual Gateway</p>
                                <h3 className={typography.h2}>Express Access QR</h3>
                            </div>
                            <div className="relative group p-2">
                                <div className="absolute -inset-2 bg-[var(--qb-primary)]/5 rounded-3xl blur-xl group-hover:bg-[var(--qb-primary)]/10 transition-all" />
                                <div className="relative bg-white p-3 rounded-2xl border-2 border-slate-100 shadow-xl shadow-[var(--qb-primary)]/5">
                                    <img src={qrUrl} alt="Room QR" className="w-48 h-48 rounded-lg" />
                                </div>
                            </div>
                            <p className={cx(typography.small, "max-w-[200px]")}>
                                Participants can scan this unique identity token to bypass code entry.
                            </p>
                        </div>

                        {/* Roster Intel */}
                        <div className={cx(cards.default, "flex flex-col")}>
                            <div className={cx(layout.rowBetween, "mb-4")}>
                                <div className={cx(layout.rowStart, "gap-2")}>
                                    <Users size={16} className="text-[var(--qb-primary)]" />
                                    <h3 className={typography.h3}>Active Roster</h3>
                                </div>
                                <div className={cx(typography.micro, "px-2.5 py-1 rounded-md bg-[var(--qb-primary)]/10 text-[var(--qb-primary)] border border-[var(--qb-primary)]/20 font-bold")}>
                                    {participants.length} Present
                                </div>
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                {participants.map((p, i) => (
                                    <Motion.div
                                        key={p._id || i}
                                        initial={{ opacity: 0, x: 8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className={cx(cards.flat, layout.rowBetween, "py-3")}
                                    >
                                        <div className={cx(layout.rowStart, "gap-3")}>
                                            <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            </div>
                                            <span className={typography.bodyStrong}>{p.name}</span>
                                        </div>
                                        <span className={cx(typography.micro, "text-emerald-600 dark:text-emerald-400 font-bold")}>Live</span>
                                    </Motion.div>
                                ))}

                                {participants.length === 0 && (
                                    <div className={cx(cards.empty, "py-8")}>
                                        <div className="w-10 h-10 rounded-full theme-surface-soft flex items-center justify-center text-slate-400 mb-2">
                                            <Users size={20} />
                                        </div>
                                        <p className={typography.small}>Waiting for participants...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveLobby;
