import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Clock3, EllipsisVertical, Folder, Layers, Radio } from 'lucide-react';
import { textStyles, tagStyles, controlStyles } from '../../styles/commonStyles';
import { cardStyles } from '../../styles/cardStyles';
import { buttonStyles } from '../../styles/buttonStyles';

const toDate = (value) => {
    if (!value) return 'NA';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'NA';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
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

const getVisibilityTag = (accessType) => (
    accessType === 'private'
        ? `${tagStyles.base} ${tagStyles.private}`
        : `${tagStyles.base} ${tagStyles.public}`
);

const getModeTag = (mode) => (
    mode === 'tutor'
        ? `${tagStyles.base} ${tagStyles.tutor}`
        : `${tagStyles.base} ${tagStyles.autotime}`
);

const SubjectProjectCard = ({
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
    onOpen,
    view = 'grid',
    onPrefetch,
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);
    const isList = view === 'list';

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

    const meta = useMemo(() => [
        { label: 'Created', value: toDate(quiz.createdAt), icon: CalendarDays },
        { label: 'Last Activity', value: toRelativeTime(quiz.updatedAt), icon: Clock3 },
        { label: 'Sub-quizzes', value: `${quiz.subDirectoryCount ?? 0}`, icon: Layers },
        { label: 'Sessions Live', value: `${quiz.sessionCount ?? 0}`, icon: Radio },
    ], [quiz.createdAt, quiz.subDirectoryCount, quiz.sessionCount, quiz.updatedAt]);

    const handleMenuAction = (action) => {
        setShowMenu(false);
        action();
    };

    const cardClass = isList
        ? `${cardStyles.base} ${cardStyles.listPadding} ${cardStyles.hover}`
        : `${cardStyles.base} ${cardStyles.gridPadding} ${cardStyles.hover} hover:scale-[1.01]`;

    if (isList) {
        return (
            <article className="theme-radius-card border theme-border theme-surface theme-interactive theme-hover-surface">
                <div
                    role="button"
                    tabIndex={0}
                    onClick={onOpen}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onOpen();
                        }
                    }}
                    onMouseEnter={onPrefetch}
                    onFocus={onPrefetch}
                    className="cursor-pointer px-4 py-3 theme-interactive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-indigo-300"
                >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
                        <div className="flex min-w-62.5 flex-col gap-1 md:w-110 md:shrink-0">
                            <h3 className="truncate text-sm font-semibold theme-text-primary md:text-base" title={quiz.title}>
                                {quiz.title}
                            </h3>
                            <div className="flex flex-wrap gap-4 text-xs theme-text-muted">
                                <span className="inline-flex items-center gap-1.5">
                                    <CalendarDays size={13} className="text-gray-400" />
                                    Created {toDate(quiz.createdAt)}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Clock3 size={13} className="text-gray-400" />
                                    Last activity {toRelativeTime(quiz.updatedAt)}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 text-sm theme-text-secondary md:w-65 md:shrink-0">
                            <p className="inline-flex items-center gap-1.5">
                                <Layers size={13} className="text-gray-400" />
                                Sub-quizzes <span className="font-semibold theme-text-primary">{quiz.subDirectoryCount ?? 0}</span>
                            </p>
                            <p className="inline-flex items-center gap-1.5">
                                <Radio size={13} className="text-gray-400" />
                                Sessions Live <span className="font-semibold theme-text-primary">{quiz.sessionCount ?? 0}</span>
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 md:flex-1">
                            <span className={getVisibilityTag(quiz.accessType)}>{quiz.accessType === 'private' ? 'Private' : 'Public'}</span>
                            <span className={getModeTag(quiz.mode)}>{quiz.mode === 'tutor' ? 'Tutor' : 'AutoTime'}</span>
                        </div>

                        <div className="flex items-center gap-2 md:ml-auto md:shrink-0">
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onOpen();
                                }}
                                className={`${buttonStyles.slatePrimary} inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors`}
                            >
                                Open
                            </button>

                            <div className="relative" ref={menuRef}>
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setShowMenu((prev) => !prev);
                                    }}
                                    className={controlStyles.iconButton}
                                    aria-label="Open options menu"
                                    aria-expanded={showMenu}
                                >
                                    <EllipsisVertical size={16} />
                                </button>

                                {showMenu && (
                                    <div className={cardStyles.menuPanel} onClick={(event) => event.stopPropagation()}>
                                        <button
                                            type="button"
                                            onClick={() => handleMenuAction(() => onStartEdit(quiz))}
                                            className={cardStyles.menuItem}
                                        >
                                            Rename Title
                                        </button>
                                        <button type="button" onClick={() => handleMenuAction(onOpen)} className={cardStyles.menuItem}>
                                            Open Directory
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMenuAction(onClone)}
                                            disabled={cloning}
                                            className={`${cardStyles.menuItem} disabled:cursor-not-allowed disabled:opacity-60`}
                                        >
                                            {cloning ? 'Duplicating...' : 'Duplicate'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMenuAction(() => onDelete(quiz._id))}
                                            className={cardStyles.menuItemDanger}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {editingQuizId === quiz._id && (
                        <div className="mt-3 flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                            <input
                                autoFocus
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900 focus:border-gray-400 focus:outline-none"
                                value={editingTitle}
                                onChange={(event) => onEditingTitleChange(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') onRename(quiz._id);
                                    if (event.key === 'Escape') onCancelEdit();
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => onRename(quiz._id)}
                                className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-black"
                            >
                                Save
                            </button>
                            <button
                                type="button"
                                onClick={onCancelEdit}
                                className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            </article>
        );
    }

    return (
        <article className={cardClass}>
            <div
                role="button"
                tabIndex={0}
                onClick={onOpen}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onOpen();
                    }
                }}
                onMouseEnter={onPrefetch}
                onFocus={onPrefetch}
                className={isList ? cardStyles.listLayout : cardStyles.gridLayout}
            >
                <div className={isList ? cardStyles.contentGrid : cardStyles.contentGridDefault}>
                    <div className={cardStyles.headerRow}>
                        <div className="min-w-0 flex items-center gap-2">
                            <Folder size={16} className="shrink-0 text-gray-400" />
                            <h3 className={`${textStyles.title} truncate`} title={quiz.title}>
                                {quiz.title}
                            </h3>
                        </div>
                        <div className="relative shrink-0" ref={menuRef}>
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setShowMenu((prev) => !prev);
                                }}
                                className={controlStyles.iconButton}
                                aria-label="Open options menu"
                                aria-expanded={showMenu}
                            >
                                <EllipsisVertical size={16} />
                            </button>
                            {showMenu && (
                                <div
                                    className={cardStyles.menuPanel}
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleMenuAction(() => onStartEdit(quiz))}
                                        className={cardStyles.menuItem}
                                    >
                                        Rename Title
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleMenuAction(onOpen)}
                                        className={cardStyles.menuItem}
                                    >
                                        Open Directory
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleMenuAction(onClone)}
                                        disabled={cloning}
                                        className={`${cardStyles.menuItem} disabled:cursor-not-allowed disabled:opacity-60`}
                                    >
                                        {cloning ? 'Duplicating...' : 'Duplicate'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleMenuAction(() => onDelete(quiz._id))}
                                        className={cardStyles.menuItemDanger}
                                    >
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {editingQuizId === quiz._id && (
                        <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                            <input
                                autoFocus
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900 focus:border-gray-400 focus:outline-none"
                                value={editingTitle}
                                onChange={(event) => onEditingTitleChange(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') onRename(quiz._id);
                                    if (event.key === 'Escape') onCancelEdit();
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => onRename(quiz._id)}
                                className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-black"
                            >
                                Save
                            </button>
                            <button
                                type="button"
                                onClick={onCancelEdit}
                                className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                        </div>
                    )}

                    <div className={isList ? cardStyles.metaList : cardStyles.metaGrid}>
                        {meta.map((item) => {
                            const IconComponent = item.icon;
                            return (
                                <div key={item.label} className="flex items-center gap-2 min-w-0">
                                    <IconComponent size={14} className="shrink-0 text-gray-400" />
                                    <div className="min-w-0">
                                        <p className={textStyles.metaLabel}>{item.label}</p>
                                        <p className={`${textStyles.metaValue} truncate`}>{item.value}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className={isList ? cardStyles.actionAreaList : cardStyles.actionAreaGrid}>
                    <div className={cardStyles.tagRow}>
                        <span className={getVisibilityTag(quiz.accessType)}>{quiz.accessType === 'private' ? 'Private' : 'Public'}</span>
                        <span className={getModeTag(quiz.mode)}>{quiz.mode === 'tutor' ? 'Tutor' : 'AutoTime'}</span>
                    </div>

                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onOpen();
                        }}
                        className={isList
                            ? `ml-auto ${buttonStyles.slatePrimary} inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-colors`
                            : `${buttonStyles.slatePrimary} inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-medium transition-colors`}
                    >
                        Open Directory
                    </button>
                </div>
            </div>
        </article>
    );
};

export default SubjectProjectCard;
