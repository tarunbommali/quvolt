/* eslint-disable no-unused-vars */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    addQuestion,
    createQuiz as apiCreateQuiz,
    deleteQuiz as apiDeleteQuiz,
    updateQuiz as apiUpdateQuiz,
    isTransientApiError,
} from '../services/api';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowUpDown, LayoutGrid, List, Plus, SlidersHorizontal } from 'lucide-react';
import Toast from '../components/common/Toast';
import ConfirmationDialog from '../components/common/ConfirmationDialog';
import useToast from '../hooks/useToast';
import { prefetchOrganizerEditRoute, prefetchOrganizerLiveRoute } from '../utils/routePrefetch';
import { useAuthStore } from '../stores/useAuthStore';
import { useQuizStore } from '../stores/useQuizStore';
import ProjectGrid from '../components/organizerDashboard/ProjectGrid';
import CreateTemplatePanel from '../components/organizerDashboard/CreateTemplatePanel';
import { LivePulseBadge } from '../components/ui';
import { layoutStyles } from '../styles/layoutStyles';
import { components } from '../styles/components';
import { cx } from '../styles/theme';
import { motionTokens } from '../design';

const REQUEST_TIMEOUT_MS = 12000;

const withTimeout = (promise, ms = REQUEST_TIMEOUT_MS) =>
    Promise.race([
        promise,
        new Promise((_, reject) => {
            const timeoutId = window.setTimeout(() => {
                window.clearTimeout(timeoutId);
                reject(new Error('Request timed out'));
            }, ms);
        }),
    ]);

const getNextCloneTitle = (sourceTitle, existingTitles = []) => {
    const safeBase = String(sourceTitle || 'Untitled Template').trim() || 'Untitled Template';
    const normalizedExisting = new Set(
        existingTitles
            .map((title) => String(title || '').trim().toLowerCase())
            .filter(Boolean),
    );

    const firstCopy = `${safeBase} Copy`;
    if (!normalizedExisting.has(firstCopy.toLowerCase())) {
        return firstCopy;
    }

    let index = 2;
    while (normalizedExisting.has(`${safeBase} Copy ${index}`.toLowerCase())) {
        index += 1;
    }

    return `${safeBase} Copy ${index}`;
};

const StudioDashboard = () => {
    const { folderId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const navigateRef = useRef(navigate);
    const showToastRef = useRef(null);

    const [quizzes, setQuizzes] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [newQuizTitle, setNewQuizTitle] = useState('');
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [currentSubject, setCurrentSubject] = useState(null);
    const [quizType, setQuizType] = useState('quiz');
    const [accessType, setAccessType] = useState('public');
    const [allowedEmailsText, setAllowedEmailsText] = useState('');
    const [quizMode, setQuizMode] = useState('auto');
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [editingQuizId, setEditingQuizId] = useState(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [isPaid, setIsPaid] = useState(false);
    const [quizPrice, setQuizPrice] = useState('');
    const [cloning, setCloning] = useState(false);
    const [viewMode, setViewMode] = useState('list');
    const [sortMode, setSortMode] = useState('activity');
    const [filterMode, setFilterMode] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileView, setIsMobileView] = useState(false);

    const user = useAuthStore((state) => state.user);
    const authLoading = useAuthStore((state) => state.loading);
    const { toast, showToast, clearToast } = useToast();

    useEffect(() => {
        navigateRef.current = navigate;
    }, [navigate]);

    useEffect(() => {
        showToastRef.current = showToast;
    }, [showToast]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const mediaQuery = window.matchMedia('(max-width: 767px)');
        const handleViewportChange = () => {
            const nextIsMobile = mediaQuery.matches;
            setIsMobileView(nextIsMobile);
            if (nextIsMobile) {
                setViewMode('list');
            }
        };

        handleViewportChange();
        mediaQuery.addEventListener('change', handleViewportChange);

        return () => {
            mediaQuery.removeEventListener('change', handleViewportChange);
        };
    }, []);

    const effectiveViewMode = isMobileView ? 'list' : viewMode;

    const visibleQuizzes = useMemo(() => {
        const toTimestamp = (value) => {
            if (!value) return 0;
            const parsed = new Date(value).getTime();
            return Number.isNaN(parsed) ? 0 : parsed;
        };

        const byActivityLatest = (a, b) => {
            const aActivity = Math.max(toTimestamp(a.updatedAt), toTimestamp(a.createdAt));
            const bActivity = Math.max(toTimestamp(b.updatedAt), toTimestamp(b.createdAt));
            return bActivity - aActivity;
        };

        const byCreatedNewest = (a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt);
        const byCreatedOldest = (a, b) => toTimestamp(a.createdAt) - toTimestamp(b.createdAt);
        const query = searchQuery.trim().toLowerCase();

        const filtered = quizzes.filter((quiz) => {
            if (filterMode === 'public' && quiz.accessType !== 'public') return false;
            if (filterMode === 'private' && quiz.accessType !== 'private') return false;
            if (filterMode === 'live' && quiz.status !== 'live') return false;

            if (!query) return true;

            const haystack = [
                quiz.title,
                quiz.accessType,
                quiz.mode,
                quiz.status,
                quiz.type,
            ]
                .map((value) => String(value || '').toLowerCase())
                .join(' ');

            return haystack.includes(query);
        });

        const sorted = [...filtered];
        if (sortMode === 'newest') return sorted.sort(byCreatedNewest);
        if (sortMode === 'oldest') return sorted.sort(byCreatedOldest);
        return sorted.sort(byActivityLatest);
    }, [filterMode, quizzes, searchQuery, sortMode]);

    const liveSessionCount = useMemo(
        () => quizzes.filter((quiz) => ['live', 'waiting'].includes(String(quiz?.status || '').toLowerCase())).length,
        [quizzes],
    );

    const showConfirm = (message, onConfirm) => {
        setConfirmDialog({ message, onConfirm });
    };

    const parseAllowedEmails = useCallback((rawText) => {
        if (!rawText) return [];
        return Array.from(new Set(
            String(rawText)
                .split(/[\n,;]+/)
                .map((value) => value.trim().toLowerCase())
                .filter(Boolean),
        ));
    }, []);

    useEffect(() => {
        let active = true;

        const syncCurrentFolder = async () => {
            if (!folderId) {
                if (active) setCurrentSubject(null);
                return;
            }

            const subjectFromState = location.state?.subject;
            if (subjectFromState && String(subjectFromState._id) === String(folderId)) {
                if (active) setCurrentSubject(subjectFromState);
                return;
            }

            try {
                let rootItems = await useQuizStore.getState().getQuizzesForParent('none');
                let matched = rootItems.find((item) => item.type === 'subject' && String(item._id) === String(folderId));

                if (!matched) {
                    rootItems = await useQuizStore.getState().getQuizzesForParent('none', { force: true });
                    matched = rootItems.find((item) => item.type === 'subject' && String(item._id) === String(folderId));
                }

                if (!active) return;

                if (!matched) {
                    showToastRef.current?.('Folder not found');
                    navigateRef.current('/studio', { replace: true });
                    return;
                }

                setCurrentSubject(matched);
            } catch {
                if (!active) return;
                showToastRef.current?.('Failed to load folder');
                navigateRef.current('/studio', { replace: true });
            }
        };

        syncCurrentFolder();

        return () => {
            active = false;
        };
    }, [folderId, location.state?.subject]);

    useEffect(() => {
        let active = true;

        const loadQuizzes = async () => {
            if (authLoading || !user?._id) return;

            if (!['organizer', 'admin'].includes(user.role)) {
                if (active) setQuizzes([]);
                return;
            }

            try {
                const parentId = currentSubject ? currentSubject._id : 'none';
                const data = await withTimeout(useQuizStore.getState().getQuizzesForParent(parentId));
                if (!active) return;
                setQuizzes(data);
            } catch (error) {
                if (active) {
                    setQuizzes([]);
                    showToastRef.current?.('Failed to load quizzes');
                }
            }
        };

        loadQuizzes();

        return () => {
            active = false;
        };
    }, [authLoading, currentSubject, user?._id, user?.role]);

    const handleRenameQuiz = async (quizId) => {
        if (!editingTitle.trim()) {
            setEditingQuizId(null);
            return;
        }

        const nextTitle = editingTitle.trim();
        const previousQuizzes = quizzes;
        const previousActiveQuiz = activeQuiz;
        const optimisticQuizzes = quizzes.map((quiz) => (quiz._id === quizId ? { ...quiz, title: nextTitle } : quiz));
        const parentId = currentSubject ? currentSubject._id : 'none';

        setQuizzes(optimisticQuizzes);
        useQuizStore.getState().setQuizzesForParent(parentId, optimisticQuizzes);

        if (previousActiveQuiz && previousActiveQuiz._id === quizId) {
            setActiveQuiz({ ...previousActiveQuiz, title: nextTitle });
        }

        try {
            const updated = await apiUpdateQuiz(quizId, { title: nextTitle });
            const next = optimisticQuizzes.map((quiz) => (quiz._id === updated._id ? updated : quiz));
            setQuizzes(next);
            useQuizStore.getState().setQuizzesForParent(parentId, next);
            if (activeQuiz && activeQuiz._id === updated._id) setActiveQuiz(updated);
            showToast('Title updated!', 'success');
        } catch (error) {
            setQuizzes(previousQuizzes);
            useQuizStore.getState().setQuizzesForParent(parentId, previousQuizzes);
            if (previousActiveQuiz && previousActiveQuiz._id === quizId) {
                setActiveQuiz(previousActiveQuiz);
            }
            showToast(
                isTransientApiError(error)
                    ? 'Temporary network issue. Rename failed after retries.'
                    : 'Failed to rename',
            );
        } finally {
            setEditingQuizId(null);
            setEditingTitle('');
        }
    };

    const createQuiz = async () => {
        if (!newQuizTitle.trim()) {
            showToast('Please enter a title');
            return;
        }

        const title = newQuizTitle.trim();
        const tempId = `temp-${Date.now()}`;
        const now = new Date().toISOString();
        const optimisticQuiz = {
            _id: tempId,
            title,
            type: quizType,
            mode: quizType === 'quiz' ? quizMode : 'auto',
            accessType,
            allowedEmails: accessType === 'private' ? parseAllowedEmails(allowedEmailsText) : [],
            status: 'draft',
            createdAt: now,
            updatedAt: now,
            questions: [],
            sessionCount: 0,
            subDirectoryCount: 0,
            isPaid,
            price: isPaid ? Number(quizPrice) || 0 : 0,
        };

        const previousQuizzes = quizzes;
        const optimisticQuizzes = [optimisticQuiz, ...quizzes];
        const parentId = currentSubject ? currentSubject._id : 'none';

        setQuizzes(optimisticQuizzes);
        useQuizStore.getState().setQuizzesForParent(parentId, optimisticQuizzes);

        try {
            const data = await apiCreateQuiz(
                title,
                quizType,
                currentSubject ? currentSubject._id : null,
                isPaid,
                isPaid ? Number(quizPrice) || 0 : 0,
                {
                    mode: quizType === 'quiz' ? quizMode : 'auto',
                    accessType,
                    allowedEmails: accessType === 'private' ? parseAllowedEmails(allowedEmailsText) : [],
                },
            );
            const next = optimisticQuizzes.map((quiz) => (quiz._id === tempId ? data : quiz));
            setQuizzes(next);
            useQuizStore.getState().setQuizzesForParent(parentId, next);
            setNewQuizTitle('');
            setShowCreate(false);
            setIsPaid(false);
            setQuizPrice('');
            setAccessType('public');
            setAllowedEmailsText('');
            setQuizMode('auto');
            if (data.type === 'quiz') {
                setActiveQuiz(data);
                navigateRef.current(`/edit/${data._id}`);
            }
        } catch (error) {
            setQuizzes(previousQuizzes);
            useQuizStore.getState().setQuizzesForParent(parentId, previousQuizzes);
            const message = error.response?.data?.message ||
                (isTransientApiError(error)
                    ? 'Temporary network issue. Create failed after retries.'
                    : 'Failed to create template');
            showToast(message);
        }
    };

    const cloneTemplate = async (source) => {
        if (!source) {
            showToast('Source template not found');
            return;
        }

        const nextTitle = getNextCloneTitle(source.title, quizzes.map((quiz) => quiz.title));

        setCloning(true);
        try {
            const created = await apiCreateQuiz(
                nextTitle,
                source.type,
                currentSubject ? currentSubject._id : (source.parentId || null),
                Boolean(source.isPaid),
                source.isPaid ? Number(source.price || 0) : 0,
                {
                    mode: source.mode === 'teaching' ? 'tutor' : (source.mode || 'auto'),
                    accessType: source.accessType || 'public',
                    allowedEmails: source.accessType === 'private' ? (source.allowedEmails || []) : [],
                },
            );

            // Clone question set for quiz templates.
            if (source.type === 'quiz' && Array.isArray(source.questions) && source.questions.length > 0) {
                for (const question of source.questions) {
                    await addQuestion(created._id, {
                        text: question.text,
                        options: question.options,
                        correctOption: question.correctOption,
                        timeLimit: question.timeLimit,
                        shuffleOptions: Boolean(question.shuffleOptions),
                    });
                }
            }

            const parentId = currentSubject ? currentSubject._id : 'none';
            const refreshed = await useQuizStore.getState().getQuizzesForParent(parentId, { force: true });
            setQuizzes(refreshed);
            useQuizStore.getState().setQuizzesForParent(parentId, refreshed);
            showToast('Template cloned successfully!', 'success');
        } catch (error) {
            const message = error.response?.data?.message ||
                (isTransientApiError(error)
                    ? 'Temporary network issue. Clone failed after retries.'
                    : 'Failed to clone template');
            showToast(message);
        } finally {
            setCloning(false);
        }
    };

    const handleDeleteQuiz = (quizId) => {
        showConfirm('All data for this project will be permanently wiped. This cannot be undone.', async () => {
            setConfirmDialog(null);
            const previousQuizzes = quizzes;
            const parentId = currentSubject ? currentSubject._id : 'none';
            const optimisticQuizzes = quizzes.filter((quiz) => quiz._id !== quizId);
            setQuizzes(optimisticQuizzes);
            useQuizStore.getState().setQuizzesForParent(parentId, optimisticQuizzes);

            try {
                await apiDeleteQuiz(quizId);
                showToast('Template deleted', 'success');
            } catch (error) {
                setQuizzes(previousQuizzes);
                useQuizStore.getState().setQuizzesForParent(parentId, previousQuizzes);
                showToast(
                    isTransientApiError(error)
                        ? 'Temporary network issue. Delete failed after retries.'
                        : 'Failed to delete template',
                );
            }
        });
    };

    const prefetchQuizNavigation = useCallback((quiz) => {
        const parentId = currentSubject ? currentSubject._id : 'none';
        useQuizStore.getState().prefetchQuizForParent(parentId).catch(() => {});
        if (quiz?.type === 'subject' && quiz?._id) {
            useQuizStore.getState().prefetchQuizForParent(quiz._id).catch(() => {});
        }
        if (quiz?.type === 'quiz') {
            prefetchOrganizerEditRoute().catch(() => {});
            prefetchOrganizerLiveRoute().catch(() => {});
        }
    }, [currentSubject]);

    const handleToggleCreate = () => {
        setShowCreate(!showCreate);
    };

    const controlBar = (
        <Motion.div
            initial={motionTokens.fadeUp.hidden}
            animate={motionTokens.fadeUp.visible}
            transition={motionTokens.transition.smooth}
            className={components.studio.controlBar}
        >
            <div className={components.studio.controlInner}>
                <div className={components.studio.headingWrap}>
                    {currentSubject && (
                        <p className={components.studio.crumb}>Studio / {currentSubject.title}</p>
                    )}
                    <h1 className={components.studio.title}>
                        {currentSubject ? currentSubject.title : 'Studio'}
                    </h1>
                    <p className={components.studio.subtitle}>
                        {currentSubject ? 'Manage quizzes in this folder' : 'Manage your quizzes'}
                    </p>
                    <LivePulseBadge count={liveSessionCount} label="sessions live" />
                </div>

                <div className={components.studio.centerControlsWrap}>
                    <div className={components.studio.segmentedShell}>
                        <div className={components.studio.segmentedInner}>
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                disabled={isMobileView}
                                className={cx(
                                    components.studio.modeBtnBase,
                                    effectiveViewMode === 'grid' ? components.studio.modeBtnActive : components.studio.modeBtnIdle,
                                    components.studio.modeBtnDisabled,
                                )}
                                aria-pressed={effectiveViewMode === 'grid'}
                            >
                                <LayoutGrid size={14} /> Grid
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className={cx(
                                    components.studio.modeBtnBase,
                                    effectiveViewMode === 'list' ? components.studio.modeBtnActive : components.studio.modeBtnIdle,
                                )}
                                aria-pressed={effectiveViewMode === 'list'}
                            >
                                <List size={14} /> List
                            </button>
                        </div>

                        <label className={components.studio.sortFilterLabel}>
                            <ArrowUpDown size={13} />
                            <span>Sort</span>
                            <select
                                value={sortMode}
                                onChange={(event) => setSortMode(event.target.value)}
                                className={components.studio.sortFilterSelect}
                                aria-label="Sort quiz templates"
                            >
                                <option value="activity">Activity (Latest)</option>
                                <option value="newest">Newest</option>
                                <option value="oldest">Oldest</option>
                            </select>
                        </label>

                        <label className={components.studio.sortFilterLabel}>
                            <SlidersHorizontal size={13} />
                            <span>Filter</span>
                            <select
                                value={filterMode}
                                onChange={(event) => setFilterMode(event.target.value)}
                                className={components.studio.sortFilterSelect}
                                aria-label="Filter quiz templates"
                            >
                                <option value="all">All</option>
                                <option value="public">Public</option>
                                <option value="private">Private</option>
                                <option value="live">Live</option>
                            </select>
                        </label>
                    </div>
                </div>

                <div className={components.studio.actionWrap}>
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search templates"
                        className={components.studio.searchInput}
                        aria-label="Search templates"
                    />

                    <button
                        onClick={handleToggleCreate}
                        className={components.studio.newBtn}
                    >
                        <Plus size={16} />
                        {showCreate ? 'Close Menu' : 'New Template'}
                    </button>
                </div>
            </div>
        </Motion.div>
    );

    return (
        <>
            <AnimatePresence>
                {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
                {confirmDialog && (
                    <ConfirmationDialog
                        open={!!confirmDialog}
                        message={confirmDialog.message}
                        confirmLabel="Delete"
                        onConfirm={confirmDialog.onConfirm}
                        onCancel={() => setConfirmDialog(null)}
                    />
                )}
            </AnimatePresence>

            <div className={cx(components.studio.pageShell, layoutStyles.pageStack)}>
                {controlBar}

                <ProjectGrid
                    quizzes={visibleQuizzes}
                    cloning={cloning}
                    editingQuizId={editingQuizId}
                    editingTitle={editingTitle}
                    onStartEdit={(quiz) => {
                        setEditingQuizId(quiz._id);
                        setEditingTitle(quiz.title);
                    }}
                    onEditingTitleChange={setEditingTitle}
                    onRename={handleRenameQuiz}
                    onCancelEdit={() => setEditingQuizId(null)}
                    onDelete={handleDeleteQuiz}
                    onClone={cloneTemplate}
                    onOpenSubject={(subject) => {
                        prefetchQuizNavigation(subject);
                        navigate(`/studio/${subject._id}`, { state: { subject } });
                    }}
                    onEditQuiz={(quiz) => navigate(`/edit/${quiz._id}`, { state: { quiz } })}
                    onGoLive={(quiz) => {
                        if (quiz?.type === 'subject') {
                            navigate(`/studio/${quiz._id}`, { state: { subject: quiz } });
                            return;
                        }

                        if (String(quiz?.status || '').toLowerCase() === 'waiting') {
                            navigate(`/invite/${quiz._id}`, {
                                state: { quiz, forceLaunch: true },
                            });
                            return;
                        }

                        navigate(`/launch/${quiz._id}`, {
                            state: { quiz, forceLaunch: true },
                        });
                    }}
                    onPrefetch={prefetchQuizNavigation}
                    viewMode={effectiveViewMode}
                />

                <CreateTemplatePanel
                    showCreate={showCreate}
                    currentSubject={currentSubject}
                    quizType={quizType}
                    onQuizTypeChange={setQuizType}
                    accessType={accessType}
                    onAccessTypeChange={setAccessType}
                    allowedEmailsText={allowedEmailsText}
                    onAllowedEmailsTextChange={setAllowedEmailsText}
                    quizMode={quizMode}
                    onQuizModeChange={setQuizMode}
                    newQuizTitle={newQuizTitle}
                    onTitleChange={setNewQuizTitle}
                    onCreate={createQuiz}
                    isPaid={isPaid}
                    onPaidToggle={() => setIsPaid(!isPaid)}
                    quizPrice={quizPrice}
                    onPriceChange={setQuizPrice}
                />
            </div>
        </>
    );
};

export default StudioDashboard;
