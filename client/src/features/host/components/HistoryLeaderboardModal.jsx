import React from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Timer, Star } from 'lucide-react';
import Modal from '../../../components/common/ui/Modal';
import { textStyles, components } from '../../../styles/index';

const HistoryLeaderboardModal = ({ open, leaderboard, meta, onClose }) => (
    <Modal open={open}>
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                    <Motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />
                    
                    <Motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        <div className="p-8 border-b theme-border flex items-center justify-between bg-gradient-to-r from-indigo-500/5 to-purple-500/5">
                            <div className="space-y-1">
                                <h2 className={textStyles.value2Xl + " !font-black !text-2xl theme-text-primary"}>{meta.title}</h2>
                                <p className={textStyles.tinyMuted + " font-black uppercase tracking-[0.2em]"}>{meta.sub}</p>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center theme-text-muted hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                            {leaderboard.map((player, i) => (
                                <Motion.div 
                                    key={player.name || i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border theme-border group hover:border-indigo-500/30 transition-all"
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                                        i === 0 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 
                                        i === 1 ? 'bg-slate-300 text-slate-700' : 
                                        i === 2 ? 'bg-orange-400 text-white' : 
                                        'bg-gray-100 dark:bg-white/10 text-slate-400'
                                    }`}>
                                        {i < 3 ? <Trophy size={20} /> : `#${i + 1}`}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-base font-black theme-text-primary">{player.name}</p>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <Timer size={12} className="text-slate-400" />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{player.time ? `${player.time.toFixed(1)}s avg` : 'Mastery Record'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-indigo-500 tracking-tighter">{player.score}</p>
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Points</p>
                                    </div>
                                </Motion.div>
                            ))}
                            
                            {leaderboard.length === 0 && (
                                <div className="py-20 text-center space-y-4">
                                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/5 mx-auto flex items-center justify-center text-slate-300">
                                        <Star size={32} />
                                    </div>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No mastery data recorded yet</p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-gray-50 dark:bg-white/5 border-t theme-border flex items-center justify-center">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Top {leaderboard.length} Performers Displayed</span>
                        </div>
                    </Motion.div>
                </div>
            )}
        </AnimatePresence>
    </Modal>
);

export default HistoryLeaderboardModal;

