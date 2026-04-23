import React, { useEffect, useRef, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { EllipsisVertical, Play, Settings2, History, Copy, Trash2, Edit3, FolderOpen } from 'lucide-react';

import { cx, buttonStyles } from '../../../styles/index';

const toDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const toRelativeTime = (value) => {
    if (!value) return 'Just now';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Just now';

    const diffMs = Date.now() - date.getTime();
    const minutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.round(hours / 24);
    if (days < 7) return `${days}d ago`;

    return toDate(value);
};

const TemplateCard = ({ template, view = 'grid', cloning, onEdit, onDelete, onClone, onGoLive, onOpenSubject, onPrefetch, onSessionSettings, onViewHistory }) => {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);
    const isList = view === 'list';

    useEffect(() => {
        if (!showMenu) return undefined;
        const onMouseDown = (e) => menuRef.current && !menuRef.current.contains(e.target) && setShowMenu(false);
        const onKeyDown = (e) => e.key === 'Escape' && setShowMenu(false);
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [showMenu]);

    const handleMenuAction = (handler) => {
        setShowMenu(false);
        handler();
    };

    const statusLabel = String(template.status || '').toLowerCase();
    const isFolder = template.type === 'subject';
    
    return (
        <article
            onMouseEnter={() => onPrefetch && onPrefetch(template)}
            onFocus={() => onPrefetch && onPrefetch(template)}
            className={cx(
                "group relative bg-white dark:bg-[#0f172a] rounded-xl border border-neutral-200 dark:border-white/10 hover:shadow-md hover:-translate-y-[1px] transition-all duration-200 overflow-visible",
                isList ? "flex flex-row items-center justify-between px-5 py-3 h-[72px] md:h-[88px]" : "flex flex-col px-5 py-3",
                showMenu ? "z-50" : "z-10"
            )}
        >
            {/* LINE 1 & 2: LEFT / TOP SECTION */}
            <div className={cx("flex flex-col gap-1 min-w-0 flex-1")}>
                
                {/* Line 1: Title + Badge */}
                <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-semibold truncate theme-text-primary" title={template.title}>
                        {template.title || 'Untitled Template'}
                    </h3>
                    
                    <div className={cx(
                        "px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wide font-medium whitespace-nowrap",
                        template.accessType === "private"
                            ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20"
                            : "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                    )}>
                        {template.accessType || 'PUBLIC'}
                    </div>

                    {statusLabel === "live" && (
                        <div className="px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wide font-medium whitespace-nowrap text-red-600 bg-red-50 dark:bg-red-900/20 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Live
                        </div>
                    )}
                </div>

                {/* Line 2: Metadata */}
                <div className="flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400 truncate">
                    {isFolder ? (
                        <>
                            <span>{template.subDirectoryCount || 0} items</span>
                            <span>•</span>
                            <span>{toRelativeTime(template.updatedAt)}</span>
                        </>
                    ) : (
                        <>
                            <span>{template.questions?.length || 0} Q</span>
                            <span>•</span>
                            <span>{template.sessionCount || 0} sessions</span>
                            <span>•</span>
                            <span>{toRelativeTime(template.updatedAt)}</span>
                        </>
                    )}
                </div>
            </div>

            {/* RIGHT / BOTTOM SECTION: PLAY & MENU */}
            <div className={cx(
                "flex items-center gap-2 shrink-0",
                isList ? "ml-4" : "mt-3 self-end"
            )}>
                {isFolder ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenSubject?.();
                        }}
                        className={cx(
                            buttonStyles.secondary,
                            "!px-3 !py-1.5 !text-[13px] !rounded-lg flex items-center gap-1.5 font-medium shadow-sm border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                        )}
                    >
                        <FolderOpen size={14} /> Open
                    </button>
                ) : (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onGoLive();
                        }}
                        className={cx(
                            buttonStyles.primary,
                            "!px-3 !py-1.5 !text-[13px] !rounded-lg flex items-center gap-1.5 font-medium shadow-sm"
                        )}
                    >
                        <Play size={14} fill="currentColor" /> Play
                    </button>
                )}

                <div className="relative" ref={menuRef}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(!showMenu);
                        }}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <EllipsisVertical size={16} />
                    </button>

                    <AnimatePresence>
                        {showMenu && (
                            <Motion.div
                                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                className="absolute right-0 top-full mt-1 w-48 p-2 rounded-xl bg-white dark:bg-[#1e293b] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-neutral-100 dark:border-white/5 z-50 flex flex-col gap-0.5"
                            >
                                <button onClick={() => handleMenuAction(onEdit)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-[13px] font-medium theme-text-primary">
                                    <Edit3 size={14} /> Edit
                                </button>

                                <button onClick={() => handleMenuAction(onClone)} disabled={cloning} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-[13px] font-medium theme-text-primary disabled:opacity-50">
                                    <Copy size={14} /> {cloning ? "Duplicating..." : "Duplicate"}
                                </button>

                                {!isFolder && (
                                    <>
                                        <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2 my-1" />

                                        <button onClick={() => handleMenuAction(onSessionSettings)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/10 text-amber-600 transition-colors text-[13px] font-medium">
                                            <Settings2 size={14} /> Settings
                                        </button>

                                        <button onClick={() => handleMenuAction(onViewHistory)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/10 text-indigo-600 transition-colors text-[13px] font-medium">
                                            <History size={14} /> History
                                        </button>
                                    </>
                                )}

                                <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2 my-1" />

                                <button onClick={() => handleMenuAction(onDelete)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 transition-colors text-[13px] font-medium">
                                    <Trash2 size={14} /> Delete
                                </button>
                            </Motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </article>
    );
};

export default TemplateCard;
