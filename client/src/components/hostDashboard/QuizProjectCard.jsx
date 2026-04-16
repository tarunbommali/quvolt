import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Check, Clock, EllipsisVertical, Play, Radio, X, Zap } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';

const INR_SYMBOL = '\u20B9';
const badgeClass = 'inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]';

const QuizProjectCard = ({
    quiz,
    editingQuizId,
    editingTitle,
    onStartEdit,
    onEditingTitleChange,
    onRename,
    onCancelEdit,
    onDelete,
    onClone,
    cloning,
    onEdit,
    onGoLive,
    onPrefetch,
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        if (!showMenu) return undefined;

        const closeOnOutsideClick = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };

        const closeOnEscape = (event) => {
            if (event.key === 'Escape') {
                setShowMenu(false);
            }
        };

        document.addEventListener('mousedown', closeOnOutsideClick);
        document.addEventListener('keydown', closeOnEscape);

        return () => {
            document.removeEventListener('mousedown', closeOnOutsideClick);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [showMenu]);

    const handleMenuAction = (action) => {
        setShowMenu(false);
        action();
    };

    return (
        <>
        <div className="flex justify-between items-start">
            {editingQuizId === quiz._id ? (
                <div className="flex items-center gap-2 w-full" onClick={(event) => event.stopPropagation()}>
                    <input
                        autoFocus
                        className="w-full text-base font-bold py-2 px-4 bg-gray-50 border border-indigo-200 rounded-xl flex-1 text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors"
                        value={editingTitle}
                        onChange={(event) => onEditingTitleChange(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') onRename(quiz._id);
                            if (event.key === 'Escape') onCancelEdit();
                        }}
                    />
                    <button onClick={() => onRename(quiz._id)} className="p-2.5 bg-green-100 text-green-600 rounded-xl hover:bg-green-200 transition-all">
                        <Check size={16} />
                    </button>
                    <button onClick={onCancelEdit} className="p-2.5 bg-gray-100 text-slate-500 rounded-xl hover:bg-gray-200 transition-all">
                        <X size={16} />
                    </button>
                </div>
            ) : (
                <h3
                    className="text-2xl font-black text-slate-900 w-3/4 truncate cursor-pointer hover:text-indigo-600 transition-colors"
                    onDoubleClick={() => onStartEdit(quiz)}
                    title="Double-click to rename"
                >
                    {quiz.title}
                </h3>
            )}
            <div className="relative flex items-center gap-2" ref={menuRef}>
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        setShowMenu((prev) => !prev);
                    }}
                    className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"
                    aria-label="Open options menu"
                    aria-expanded={showMenu}
                >
                    <EllipsisVertical size={16} />
                </button>
                {showMenu && (
                    <div
                        className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => handleMenuAction(() => onStartEdit(quiz))}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-indigo-50"
                        >
                            Rename Title
                        </button>
                        <button
                            type="button"
                            onClick={() => handleMenuAction(onEdit)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-indigo-50"
                        >
                            Edit
                        </button>
                        <button
                            type="button"
                            onClick={() => handleMenuAction(onClone)}
                            disabled={cloning}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {cloning ? 'Cloning...' : 'Clone'}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleMenuAction(() => onDelete(quiz._id))}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                            Delete
                        </button>
                    </div>
                )}
            </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-slate-400 font-medium">
            <div className="flex items-center gap-1.5">
                <CalendarDays size={11} className="text-indigo-400 shrink-0" />
                <span>Created <span className="text-slate-600 font-semibold">{new Date(quiz.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
                <Clock size={11} className="text-indigo-400 shrink-0" />
                <span>Updated <span className="text-slate-600 font-semibold">{new Date(quiz.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
                <Zap size={11} className="text-indigo-400 shrink-0" />
                <span><span className="text-slate-700 font-bold">{quiz.questions?.length || 0}</span> Slide{(quiz.questions?.length || 0) !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1.5">
                <Radio size={11} className="text-indigo-400 shrink-0" />
                <span><span className="text-slate-700 font-bold">{quiz.sessionCount ?? 0}</span> Session{(quiz.sessionCount ?? 0) !== 1 ? 's' : ''} Live</span>
            </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
            <StatusBadge status={quiz.status} />
            {quiz.isPaid && <span className="text-emerald-600 font-black">{INR_SYMBOL}{quiz.price}</span>}
        </div>

        <div className="flex flex-wrap gap-2">
            <span className={`${badgeClass} ${quiz.accessType === 'private' ? 'theme-status-private' : 'theme-status-success'}`}>
                {quiz.accessType === 'private' ? 'Private' : 'Public'}
            </span>
            <span className={`${badgeClass} ${quiz.mode === 'tutor' ? 'bg-sky-100 text-sky-700' : 'bg-indigo-100 text-indigo-700'}`}>
                {quiz.mode === 'tutor' ? 'Tutor' : 'AutoTime'}
            </span>
        </div>

        <div className="flex gap-3 pt-4">
            <button
                onClick={onGoLive}
                onMouseEnter={onPrefetch}
                onFocus={onPrefetch}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm group/btn"
            >
                <Play size={12} fill="currentColor" /> Go Live
            </button>
        </div>
    </>
    );
};

export default QuizProjectCard;
