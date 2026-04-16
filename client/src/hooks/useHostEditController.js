import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { generateAIQuiz, saveQuizFullState } from '../services/api';
import { useAuthStore } from '../stores/useAuthStore';
import { useQuizStore } from '../stores/useQuizStore';
import { useEditorState } from '../stores/useEditorState';
import { getSubscriptionEntitlements } from '../utils/subscriptionEntitlements';

const buildImportedQuestions = (payload) => {
    const source = Array.isArray(payload)
        ? payload
        : payload?.questions || payload?.slides || payload?.items || payload?.data;

    if (!Array.isArray(source)) {
        throw new Error('Paste a JSON array or an object with a questions/slides array.');
    }

    return source.map((slide, index) => {
        const text = String(slide?.text ?? slide?.question ?? slide?.title ?? '').trim();
        const optionsSource = Array.isArray(slide?.options)
            ? slide.options
            : Array.isArray(slide?.answers)
                ? slide.answers
                : Array.isArray(slide?.choices)
                    ? slide.choices
                    : [];

        const options = optionsSource.map((option) => String(option ?? '').trim()).filter(Boolean);

        if (!text) throw new Error(`Slide ${index + 1} is missing question text.`);
        if (options.length < 2) throw new Error(`Slide ${index + 1} must include at least 2 options.`);

        const rawCorrect = Number(slide?.correctOption ?? slide?.correctIndex ?? 0);
        const correctOption = Number.isInteger(rawCorrect) && rawCorrect >= 0 && rawCorrect < options.length ? rawCorrect : 0;

        return {
            text,
            options,
            correctOption,
            timeLimit: Number(slide?.timeLimit) || 15,
            shuffleOptions: Boolean(slide?.shuffleOptions),
            questionType: slide?.questionType || 'multiple-choice',
            mediaUrl: slide?.mediaUrl || null,
        };
    });
};

const categorizeSaveError = (error) => {
    const status = error?.response?.status;
    if (!error?.response) {
        return { type: 'network', title: 'Network error', message: 'Connection issue while saving. Retry once network is stable.' };
    }
    if (status === 400 || status === 422) {
        return { type: 'validation', title: 'Validation error', message: error?.response?.data?.message || 'Invalid editor data. Review slide fields.' };
    }
    return { type: 'sync', title: 'Realtime sync error', message: error?.response?.data?.message || 'Unable to synchronize full editor state.' };
};

/**
 * Controller for the host editor page.
 * Returns state, derived data, and editor action handlers.
 */
const usehostEditController = () => {
    const { templateId, quizId, id } = useParams();
    const routeQuizId = templateId || quizId || id;
    const navigate = useNavigate();
    const location = useLocation();
    const getQuizzesForParent = useQuizStore((state) => state.getQuizzesForParent);
    const user = useAuthStore((state) => state.user);

    const initializeFromQuiz = useEditorState((state) => state.initializeFromQuiz);
    const replaceFromServerQuiz = useEditorState((state) => state.replaceFromServerQuiz);
    const getSnapshot = useEditorState((state) => state.getSnapshot);
    const dirty = useEditorState((state) => state.dirty);
    const markClean = useEditorState((state) => state.markClean);
    const slides = useEditorState((state) => state.slides);
    const order = useEditorState((state) => state.order);
    const activeSlideId = useEditorState((state) => state.activeSlideId);
    const setActiveSlideByIndex = useEditorState((state) => state.setActiveSlideByIndex);
    const setActiveSlideById = useEditorState((state) => state.setActiveSlideById);
    const updateActiveSlide = useEditorState((state) => state.updateActiveSlide);
    const updateSlideById = useEditorState((state) => state.updateSlideById);
    const updateConfig = useEditorState((state) => state.updateConfig);
    const addSlide = useEditorState((state) => state.addSlide);
    const duplicateSlideAtIndex = useEditorState((state) => state.duplicateSlideAtIndex);
    const deleteSlide = useEditorState((state) => state.deleteSlide);
    const moveSlide = useEditorState((state) => state.moveSlide);
    const importSlides = useEditorState((state) => state.importSlides);
    const restoreSnapshot = useEditorState((state) => state.restoreSnapshot);
    const config = useEditorState((state) => state.config);

    const [activeQuiz, setActiveQuiz] = useState(location.state?.quiz || null);
    const [loading, setLoading] = useState(!location.state?.quiz);
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [aiDialogOpen, setAIDialogOpen] = useState(false);
    const [importJson, setImportJson] = useState('');
    const [importError, setImportError] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [saveError, setSaveError] = useState(null);

    const toastTimeoutRef = useRef(null);
    const autoSaveTimerRef = useRef(null);
    const saveInFlightRef = useRef(false);
    const queuedSaveRef = useRef(false);
    const subscriptionEntitlements = useMemo(() => getSubscriptionEntitlements(user), [user]);

    const orderedSlides = useMemo(() => {
        const byId = new Map(slides.map((slide) => [slide.clientId, slide]));
        return order.map((slideId) => byId.get(slideId)).filter(Boolean);
    }, [slides, order]);

    const activeQuestionIndex = useMemo(() => (
        Math.max(0, order.findIndex((slideId) => slideId === activeSlideId))
    ), [order, activeSlideId]);

    const activeQuestion = orderedSlides[activeQuestionIndex] || null;

    const showToast = (message, type = 'error') => {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setToast({ message, type });
        toastTimeoutRef.current = setTimeout(() => setToast(null), 3500);
    };

    const persistFullState = async ({ silent = false } = {}) => {
        if (!activeQuiz?._id) return;

        if (saveInFlightRef.current) {
            queuedSaveRef.current = true;
            return;
        }

        saveInFlightRef.current = true;
        setIsSaving(true);
        setSaveError(null);

        try {
            const snapshot = getSnapshot();
            const updatedQuiz = await saveQuizFullState(activeQuiz._id, {
                slides: snapshot.slides,
                order: snapshot.order,
                config: snapshot.config,
            });

            replaceFromServerQuiz(updatedQuiz);
            setActiveQuiz((previous) => ({ ...previous, ...updatedQuiz }));
            markClean();

            if (!silent) showToast('Saved successfully', 'success');
        } catch (error) {
            const parsed = categorizeSaveError(error);
            setSaveError(parsed);
            if (!silent) showToast(parsed.message);
        } finally {
            saveInFlightRef.current = false;
            setIsSaving(false);
            if (queuedSaveRef.current) {
                queuedSaveRef.current = false;
                persistFullState({ silent: true });
            }
        }
    };

    useEffect(() => {
        return () => {
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (!activeQuiz) {
            const fetchQuiz = async () => {
                try {
                    const quizzes = await getQuizzesForParent('none', { force: true });
                    const found = quizzes.find((quiz) => String(quiz._id) === String(routeQuizId));
                    if (!found) {
                        navigate('/studio');
                        return;
                    }
                    setActiveQuiz(found);
                } catch {
                    navigate('/studio');
                } finally {
                    setLoading(false);
                }
            };
            fetchQuiz();
            return;
        }

        initializeFromQuiz(activeQuiz);
        setLoading(false);
    }, [activeQuiz, getQuizzesForParent, routeQuizId, initializeFromQuiz, navigate]);

    useEffect(() => {
        if (!dirty || loading || !activeQuiz?._id) return;

        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

        autoSaveTimerRef.current = setTimeout(() => {
            persistFullState({ silent: true });
        }, 800);

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [dirty, loading, activeQuiz?._id, order, activeSlideId, config, orderedSlides]);

    const handleDeleteQuestion = (slideId) => {
        if (!slideId) return;
        setConfirmDialog({
            message: 'Delete this slide permanently?',
            onConfirm: () => {
                deleteSlide(slideId);
                setConfirmDialog(null);
            },
        });
    };

    const handleQuestionTextChange = (value) => updateActiveSlide((slide) => ({ ...slide, text: value }));
    const handleOptionChange = (optionIndex, value) => updateActiveSlide((slide) => {
        const isMCQ = slide.questionType === 'multiple-choice' || !slide.questionType;
        let options = [...(slide.options || [])];
        
        // Ensure array is long enough for the index being edited
        while (options.length <= optionIndex) {
            options.push('');
        }
        
        options[optionIndex] = value;
        
        // If MCQ, always ensure we have at least 4 strings in the data for consistency
        if (isMCQ && options.length < 4) {
            while (options.length < 4) {
                options.push('');
            }
        }
        
        return { ...slide, options };
    });
    const handleTimeLimitChange = (value) => updateActiveSlide((slide) => ({ ...slide, timeLimit: Number(value) }));
    const handleQuestionTypeChange = (value) => updateActiveSlide((slide) => {
        let options = [...(slide.options || [])];
        if (value === 'multiple-choice' && options.length < 4) {
            while (options.length < 4) options.push('');
        }
        return { ...slide, questionType: value, options };
    });
    const handleCorrectOptionChange = (value) => updateActiveSlide((slide) => ({ ...slide, correctOption: Number(value) }));

    const handleToggleShuffleOptions = () => updateActiveSlide((slide) => ({ ...slide, shuffleOptions: !slide.shuffleOptions }));
    const handleToggleShuffleQuestions = () => updateConfig({ shuffleQuestions: !config.shuffleQuestions });

    const handleMoveQuestionUp = (index) => moveSlide(index, Math.max(index - 1, 0));
    const handleMoveQuestionDown = (index) => moveSlide(index, Math.min(index + 1, order.length - 1));
    const handleMoveSlide = (fromIndex, toIndex) => moveSlide(fromIndex, toIndex);
    const handleDuplicateSlide = (index) => duplicateSlideAtIndex(index);

    const handleApplyToAllSlides = () => {
        if (!activeQuestion) return;
        for (const slideId of order) {
            updateSlideById(slideId, (slide) => ({
                ...slide,
                questionType: activeQuestion.questionType || 'multiple-choice',
                timeLimit: Number(activeQuestion.timeLimit) || 15,
                correctOption: Number(activeQuestion.correctOption) >= 0
                    && Number(activeQuestion.correctOption) < (slide.options?.length || 0)
                    ? Number(activeQuestion.correctOption)
                    : slide.correctOption,
            }));
        }
        showToast('Applied question type, time limit, and correct answer to all slides', 'success');
    };

    const handleImportSlides = async () => {
        setImportError('');
        try {
            const parsed = JSON.parse(importJson);
            const importedQuestions = buildImportedQuestions(parsed);
            if (!importedQuestions.length) throw new Error('No valid slides were found in the JSON payload.');
            setIsImporting(true);
            importSlides(importedQuestions);
            setImportDialogOpen(false);
            setImportJson('');
            showToast(`Imported ${importedQuestions.length} slide${importedQuestions.length === 1 ? '' : 's'} successfully.`, 'success');
        } catch (error) {
            const message = error instanceof SyntaxError
                ? 'Invalid JSON. Paste a valid JSON array or object.'
                : error?.message || 'Failed to import slides';
            setImportError(message);
            showToast(message);
        } finally {
            setIsImporting(false);
        }
    };

    const ensureAiAccess = () => {
        if (!subscriptionEntitlements.canUseAiGeneration) {
            throw new Error('AI quiz generation is available on Creator and Teams plans. Upgrade from Billing to continue.');
        }
    };

    const handleOpenAIDialog = () => {
        if (!subscriptionEntitlements.canUseAiGeneration) {
            showToast('AI quiz generation is available on Creator and Teams plans. Upgrade from Billing to continue.');
            return;
        }
        setAIDialogOpen(true);
    };

    const handleAIGenerate = async ({ topic, count, distribution }) => {
        ensureAiAccess();
        return generateAIQuiz({ topic, count, distribution });
    };

    const handleAISave = async ({ quizId, questions }) => {
        ensureAiAccess();
        const result = await generateAIQuiz({ quizId, questions, persist: true });
        if (result?.quiz) {
            setActiveQuiz(result.quiz);
            initializeFromQuiz(result.quiz);
            showToast(`Saved ${result.savedCount || questions.length} AI question(s)`, 'success');
        }
        return result;
    };

    return {
        navigate,
        activeQuiz,
        config,
        loading,
        isSaving,
        toast,
        setToast,
        confirmDialog,
        setConfirmDialog,
        importDialogOpen,
        setImportDialogOpen,
        aiDialogOpen,
        handleOpenAIDialog,
        setAIDialogOpen,
        importJson,
        setImportJson,
        importError,
        setImportError,
        isImporting,
        saveError,
        persistFullState,
        orderedSlides,
        dirty,
        activeQuestionIndex,
        activeQuestion,
        activeSlideId,
        getSnapshot,
        restoreSnapshot,
        handleDeleteQuestion,
        deleteSlide,
        handleQuestionTextChange,
        handleOptionChange,
        handleTimeLimitChange,
        handleQuestionTypeChange,
        handleCorrectOptionChange,
        handleToggleShuffleOptions,
        handleToggleShuffleQuestions,
        handleMoveQuestionUp,
        handleMoveQuestionDown,
        handleMoveSlide,
        handleDuplicateSlide,
        handleApplyToAllSlides,
        handleImportSlides,
        handleAIGenerate,
        handleAISave,
        setActiveSlideByIndex,
        setActiveSlideById,
        addSlide,
    };
};

export default usehostEditController;
