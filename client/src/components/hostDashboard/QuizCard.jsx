import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Clock3, EllipsisVertical, Play, Radio, Zap } from 'lucide-react';
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

const QuizCard = ({ quiz, view = 'grid', cloning, onEdit, onDelete, onClone, onGoLive, onPrefetch }) => {
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);
    const isList = view === 'list';

    useEffect(() => {
        if (!showMenu) return undefined;

        const onMouseDown = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                setShowMenu(false);
            }
        };

        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [showMenu]);

    const meta = useMemo(() => [
        { label: 'Created', value: toDate(quiz.createdAt), icon: CalendarDays },
        { label: 'Last Activity', value: toRelativeTime(quiz.updatedAt), icon: Clock3 },
        { label: 'Slides', value: `${quiz.questions?.length || 0}`, icon: Zap },
        { label: 'Sessions Live', value: `${quiz.sessionCount ?? 0}`, icon: Radio },
    ], [quiz.createdAt, quiz.questions?.length, quiz.sessionCount, quiz.updatedAt]);

    const handleMenuAction = (handler) => {
        setShowMenu(false);
        handler();
    };

    const cardClass = isList
        ? `${cardStyles.base} ${cardStyles.listPadding} ${cardStyles.hover}`
        : `${cardStyles.base} ${cardStyles.gridPadding} ${cardStyles.hover} hover:scale-[1.01]`;

    const handleCardClick = () => {
        onEdit();
    };

    if (isList) {
        return (
            <article className="theme-radius-card border theme-border theme-surface theme-interactive theme-hover-surface">
                <div
                    role="button"
                    tabIndex={0}
                    onClick={handleCardClick}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleCardClick();
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
                                <Zap size={13} className="text-gray-400" />
                                Slides <span className="font-semibold theme-text-primary">{quiz.questions?.length || 0}</span>
                            </p>
                            <p className="inline-flex items-center gap-1.5">
                                <Radio size={13} className="text-gray-400" />
                                Sessions Live <span className="font-semibold theme-text-primary">{quiz.sessionCount ?? 0}</span>
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 md:flex-1">
                            <span className={getVisibilityTag(quiz.accessType)}>{quiz.accessType === 'private' ? 'Private' : 'Public'}</span>
                            <span className={getModeTag(quiz.mode)}>{quiz.mode === 'tutor' ? 'Tutor' : 'AutoTime'}</span>
                            {String(quiz.status || '').toLowerCase() === 'waiting' && (
                                <span className={`${tagStyles.base} ${tagStyles.upcoming}`}>Waiting</span>
                            )}
                            {String(quiz.status || '').toLowerCase() === 'live' && (
                                <span className={`${tagStyles.base} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800`}>Live</span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 md:ml-auto md:shrink-0">
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onGoLive();
                                }}
                                className={`${buttonStyles.slatePrimary} inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors`}
                            >
                                <Play size={14} className="mr-2" fill="currentColor" />
                                Invite Room
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
                                        <button type="button" onClick={() => handleMenuAction(() => onEdit())} className={cardStyles.menuItem}>
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMenuAction(() => navigate(`/quiz/templates/${quiz._id}/sessions`))}
                                            className={cardStyles.menuItem}
                                        >
                                            Session History
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
                </div>
            </article>
        );
    }

    return (
        <article className={cardClass}>
            <div
                role="button"
                tabIndex={0}
                onClick={handleCardClick}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleCardClick();
                    }
                }}
                onMouseEnter={onPrefetch}
                onFocus={onPrefetch}
                className={isList ? cardStyles.listLayout : cardStyles.gridLayout}
            >
                <div className={isList ? cardStyles.contentGrid : cardStyles.contentGridDefault}>
                    <div className={cardStyles.headerRow}>
                        <h3 className={`${textStyles.title} truncate`} title={quiz.title}>
                            {quiz.title}
                        </h3>
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
                                        onClick={() => handleMenuAction(onEdit)}
                                        className={cardStyles.menuItem}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleMenuAction(() => navigate(`/quiz/templates/${quiz._id}/sessions`))}
                                        className={cardStyles.menuItem}
                                    >
                                        Session History
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
                        {String(quiz.status || '').toLowerCase() === 'waiting' && (
                            <span className={`${tagStyles.base} ${tagStyles.upcoming}`}>Waiting</span>
                        )}
                        {String(quiz.status || '').toLowerCase() === 'live' && (
                            <span className={`${tagStyles.base} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800`}>Live</span>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onGoLive();
                        }}
                        className={isList
                            ? `ml-auto ${buttonStyles.slatePrimary} inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-colors`
                            : `${buttonStyles.slatePrimary} inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-medium transition-colors`}
                    >
                        <Play size={14} className="mr-2" fill="currentColor" />
                        Invite Room
                    </button>
                </div>
            </div>
        </article>
    );
};

export default QuizCard;
