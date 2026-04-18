import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, CheckCircle2, Zap, Loader2 } from 'lucide-react';
import { Shell, Card, Label } from './QuizLayouts';

const QuizWaitingForHost = ({ quizTitle, code, participants = [], socketConnected = false }) => {
    return (
        <Shell>
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top,var(--qb-surface-2),var(--qb-surface-1))]">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md space-y-8"
                >
                    {/* Animated Waiting Visual */}
                    <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 rounded-full border-4 border-dashed theme-border opacity-20"
                        />
                        <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-2 rounded-full border-4 border-dashed border-[var(--qb-primary)] opacity-40"
                        />
                        <div className="w-20 h-20 rounded-3xl bg-[var(--qb-primary)] flex items-center justify-center shadow-xl shadow-[var(--qb-primary-light)]">
                            <Clock size={32} className="text-white animate-pulse" />
                        </div>
                    </div>

                    {/* Header Content */}
                    <div className="text-center space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--qb-surface-3)] border theme-border">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest theme-text-secondary">Waiting Period</span>
                        </div>
                        <h1 className="text-3xl font-black theme-text-primary tracking-tight">
                            {quizTitle || 'Joining Quiz…'}
                        </h1>
                        <p className="text-sm theme-text-muted max-w-[280px] mx-auto">
                            The quiz hasn't started yet. Relax and get ready, the host will launch it soon!
                        </p>
                    </div>

                    {/* Grid of details */}
                    <div className="grid grid-cols-2 gap-3">
                        <Card className="flex flex-col items-center gap-1 text-center py-5 hover:scale-[1.02] transition-transform">
                            <Label>Quiz Code</Label>
                            <p className="text-2xl font-black text-[var(--qb-primary)] tracking-tight">
                                {code?.toUpperCase()}
                            </p>
                        </Card>
                        <Card className="flex flex-col items-center gap-1 text-center py-5 hover:scale-[1.02] transition-transform">
                            <Label>Your Status</Label>
                            <div className="flex items-center gap-1.5 mt-1">
                                <CheckCircle2 size={16} className="text-green-500" />
                                <p className="text-sm font-black theme-text-primary">Ready</p>
                            </div>
                        </Card>
                    </div>

                    {/* Wait info bar */}
                    <Card className="relative overflow-hidden group border theme-border">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[var(--qb-primary)]" />
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Users size={18} className="theme-text-muted" />
                                <div>
                                    <p className="text-sm font-bold theme-text-primary">Lobby Active</p>
                                    <p className="text-xs theme-text-muted">
                                        {Math.max(participants.length || 0, socketConnected ? 1 : 0)} peers joined
                                    </p>
                                </div>
                            </div>
                            <div className="flex -space-x-2">
                                {[...Array(Math.min(3, participants.length))].map((_, i) => (
                                    <div key={i} className="w-7 h-7 rounded-full border-2 theme-border theme-surface-soft flex items-center justify-center">
                                        <div className="w-5 h-5 rounded-full bg-slate-200" />
                                    </div>
                                ))}
                                {participants.length > 3 && (
                                    <div className="w-7 h-7 rounded-full border-2 theme-border theme-surface-soft flex items-center justify-center text-[10px] font-black theme-text-secondary bg-[var(--qb-surface-2)]">
                                        +{participants.length - 3}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Connection Footer */}
                    <div className="flex items-center justify-center gap-4 pt-4">
                        <div className="flex items-center gap-1.5 opacity-60">
                            <Zap size={12} className="text-[var(--qb-accent)]" />
                            <span className="text-[10px] font-bold uppercase tracking-wider theme-text-muted">Real-time Sync</span>
                        </div>
                        <div className="w-1 h-1 rounded-full theme-surface-3" />
                        <div className="flex items-center gap-1.5 opacity-60">
                            <Loader2 size={12} className="animate-spin theme-text-muted" />
                            <span className="text-[10px] font-bold uppercase tracking-wider theme-text-muted">Waiting for Host</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </Shell>
    );
};

export default QuizWaitingForHost;
