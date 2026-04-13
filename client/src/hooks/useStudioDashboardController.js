import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    addQuestion,
    createQuiz as apiCreateQuiz,
    deleteQuiz as apiDeleteQuiz,
    updateQuiz as apiUpdateQuiz,
    isTransientApiError,
} from '../services/api';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { prefetchOrganizerEditRoute, prefetchOrganizerLiveRoute } from '../utils/routePrefetch';
import { getSubscriptionEntitlements } from '../utils/subscriptionEntitlements';
import { useAuthStore } from '../stores/useAuthStore';
import { useQuizStore } from '../stores/useQuizStore';
import useToast from './useToast';

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

/**
 * Controller hook for the studio dashboard.
 * @returns {object} Dashboard state and action handlers.
 */
const useStudioDashboardController = () => {
    const { folderId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const navigateRef = useRef(navigate);
    const showToastRef = useRef(null);

    const [quizzes, setQuizzes] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [newQuizTitle, setNewQuizTitle] = useState('');
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [currentSubject, setCurrentSubject] = useState(location.state?.subject || null);
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
    const [isLoadingSubject, setIsLoadingSubject] = useState(Boolean(folderId));
    const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);

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
    const subscriptionEntitlements = useMemo(() => getSubscriptionEntitlements(user), [user]);
    const quizTemplateCount = useMemo(
        () => quizzes.filter((quiz) => quiz.type === 'quiz').length,
        [quizzes],
    );

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

            const haystack = [quiz.title, quiz.accessType, quiz.mode, quiz.status, quiz.type]
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

    const parseAllowedEmails = useCallback((rawText) => {
        if (!rawText) return [];
        return Array.from(new Set(
            String(rawText)
                .split(/[\n,;]+/)
                .map((value) => value.trim().toLowerCase())
                .filter(Boolean),
        ));
    }, []);

    const showConfirm = useCallback((message, onConfirm) => {
        setConfirmDialog({ message, onConfirm });
    }, []);

    useEffect(() => {
        let active = true;

        const syncCurrentFolder = async () => {
            if (active) {
                setIsLoadingSubject(Boolean(folderId));
            }

            if (!folderId) {
                if (active) {
                    setCurrentSubject(null);
                    setIsLoadingSubject(false);
                }
                return;
            }

            const subjectFromState = location.state?.subject;
            if (subjectFromState && String(subjectFromState._id) === String(folderId)) {
                if (active) {
                    setCurrentSubject(subjectFromState);
                    setIsLoadingSubject(false);
                }
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
            } finally {
                if (active) setIsLoadingSubject(false);
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
            if (authLoading) {
                return;
            }

            if (!user?._id) {
                if (active) setIsLoadingQuizzes(false);
                return;
            }

            if (!['organizer', 'admin'].includes(user.role)) {
                if (active) setQuizzes([]);
                if (active) setIsLoadingQuizzes(false);
                return;
            }

            if (active) setIsLoadingQuizzes(true);

            try {
                const parentId = currentSubject ? currentSubject._id : 'none';
                const data = await withTimeout(useQuizStore.getState().getQuizzesForParent(parentId));
                if (!active) return;
                setQuizzes(data);
            } catch {
                if (active) {
                    setQuizzes([]);
                    showToastRef.current?.('Failed to load quizzes');
                }
            } finally {
                if (active) setIsLoadingQuizzes(false);
            }
        };

        loadQuizzes();

        return () => {
            active = false;
        };
    }, [authLoading, currentSubject, user?._id, user?.role]);

    const handleRenameQuiz = useCallback(async (quizId) => {
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
    }, [activeQuiz, editingTitle, quizzes, currentSubject]);

    const createQuiz = useCallback(async () => {
        if (!newQuizTitle.trim()) {
            showToast('Please enter a title');
            return;
        }

        if (quizType === 'quiz' && quizTemplateCount >= subscriptionEntitlements.maxQuizTemplates) {
            showToast(
                `You have reached your ${subscriptionEntitlements.plan} plan limit of ${subscriptionEntitlements.maxQuizTemplates} quizzes. Upgrade from Billing to create more.`,
            );
            return;
        }

        if (accessType === 'private' && !subscriptionEntitlements.canUsePrivateHosting) {
            showToast('Private session hosting is available on Creator and Teams plans. Upgrade from Billing to continue.');
            return;
        }

        if (quizType === 'quiz' && isPaid && !subscriptionEntitlements.canCreatePaidQuiz) {
            showToast('Paid quiz creation is available on Creator and Teams plans. Upgrade from Billing to continue.');
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
    }, [newQuizTitle, quizType, quizMode, accessType, allowedEmailsText, isPaid, quizPrice, quizzes, currentSubject, parseAllowedEmails, showToast, quizTemplateCount, subscriptionEntitlements]);

    const cloneTemplate = useCallback(async (source) => {
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
    }, [quizzes, currentSubject]);

    const handleDeleteQuiz = useCallback((quizId) => {
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
    }, [quizzes, currentSubject, showConfirm]);

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

    const onOpenSubject = useCallback((subject) => {
        if (!subject?._id) return;
        prefetchQuizNavigation(subject);
        navigateRef.current(`/studio/${subject._id}`, { state: { subject } });
    }, [prefetchQuizNavigation]);

    const onEditQuiz = useCallback((quiz) => {
        if (!quiz?._id) return;
        prefetchOrganizerEditRoute().catch(() => {});
        navigateRef.current(`/edit/${quiz._id}`, { state: { quiz } });
    }, []);

    const onGoLive = useCallback((quiz) => {
        if (!quiz?._id) return;

        if (quiz?.type === 'subject') {
            onOpenSubject(quiz);
            return;
        }

        prefetchOrganizerLiveRoute().catch(() => {});

        if (String(quiz?.status || '').toLowerCase() === 'waiting') {
            navigateRef.current(`/invite/${quiz._id}`, {
                state: { quiz, forceLaunch: true },
            });
            return;
        }

        navigateRef.current(`/launch/${quiz._id}`, {
            state: { quiz, forceLaunch: true },
        });
    }, [onOpenSubject]);

    const handleAccessTypeChange = useCallback((nextAccessType) => {
        if (nextAccessType === 'private' && !subscriptionEntitlements.canUsePrivateHosting) {
            showToast('Private session hosting is available on Creator and Teams plans. Upgrade from Billing to continue.');
            return;
        }
        setAccessType(nextAccessType);
    }, [showToast, subscriptionEntitlements]);

    const handlePaidToggle = useCallback(() => {
        if (!subscriptionEntitlements.canCreatePaidQuiz) {
            showToast('Paid quiz creation is available on Creator and Teams plans. Upgrade from Billing to continue.');
            return;
        }
        setIsPaid((previous) => !previous);
    }, [showToast, subscriptionEntitlements]);

    const handleToggleCreate = useCallback(() => {
        setShowCreate((previous) => !previous);
    }, []);

    const handleViewModeChange = useCallback((nextMode) => {
        setViewMode(nextMode);
    }, []);

    return {
        quizzes,
        visibleQuizzes,
        liveSessionCount,
        showCreate,
        setShowCreate,
        handleToggleCreate,
        newQuizTitle,
        setNewQuizTitle,
        activeQuiz,
        currentSubject,
        quizType,
        setQuizType,
        accessType,
        setAccessType: handleAccessTypeChange,
        allowedEmailsText,
        setAllowedEmailsText,
        quizMode,
        setQuizMode,
        confirmDialog,
        setConfirmDialog,
        editingQuizId,
        setEditingQuizId,
        editingTitle,
        setEditingTitle,
        isPaid,
        setIsPaid,
        quizPrice,
        setQuizPrice,
        handlePaidToggle,
        cloning,
        viewMode,
        effectiveViewMode,
        sortMode,
        setSortMode,
        filterMode,
        setFilterMode,
        searchQuery,
        setSearchQuery,
        isMobileView,
        subscriptionEntitlements,
        quizTemplateCount,
        authLoading,
        isLoading: authLoading || isLoadingSubject || isLoadingQuizzes,
        user,
        toast,
        showToast,
        clearToast,
        handleRenameQuiz,
        createQuiz,
        cloneTemplate,
        handleDeleteQuiz,
        prefetchQuizNavigation,
        onOpenSubject,
        onEditQuiz,
        onGoLive,
        handleViewModeChange,
    };
};

export default useStudioDashboardController;
