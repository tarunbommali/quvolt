import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useEditorState } from '../../../stores/useEditorState';
import { getSubscriptionEntitlements } from '../../../utils/subscriptionEntitlements';

// Context
import { EditorProvider } from '../context/EditorContext.jsx';

// Domain Hooks
import useEditorData from './editor/useEditorData';
import useEditorAutosave from './editor/useEditorAutosave';
import useEditorActions from './editor/useEditorActions';
import useEditorAI from './editor/useEditorAI';
import useEditorImport from './editor/useEditorImport';
import useEditorHistory from './editor/useEditorHistory';
import useEditorCommands from './editor/useEditorCommands';

// UI Hooks
import useEditorUI from './editor/useEditorUI';

/**
 * Main Orchestrator Hook for the Host Quiz Editor.
 * Composes domain and UI hooks into an elite system with a command layer.
 */
const usehostEditController = () => {
    const { templateId, quizId, id } = useParams();
    const routeQuizId = templateId || quizId || id;
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);

    // 1. UI State Layer
    const ui = useEditorUI();

    // 2. Data Loading Layer
    const data = useEditorData(routeQuizId);

    // 3. Editor Store Bindings
    const getSnapshot = useEditorState((state) => state.getSnapshot);
    const restoreSnapshot = useEditorState((state) => state.restoreSnapshot);
    const initializeFromQuiz = useEditorState((state) => state.initializeFromQuiz);
    const slides = useEditorState((state) => state.slides);
    const order = useEditorState((state) => state.order);
    const activeSlideId = useEditorState((state) => state.activeSlideId);
    const config = useEditorState((state) => state.config);

    // 4. History Engine (Patch-Based)
    const history = useEditorHistory();

    // 5. Autosave Engine (Resilient)
    const autosave = useEditorAutosave(data.activeQuiz?._id, { showToast: ui.showToast });

    // 6. Command Layer (Elite)
    const commands = useEditorCommands({
        triggerAutosave: autosave.triggerAutosave,
        takeSnapshot: history.recordChange, // Placeholder for patch logic
        undo: history.undo,
        redo: history.redo,
        showToast: ui.showToast
    });

    // 7. Actions Layer (Coordinated)
    const actions = useEditorActions({ 
        showToast: ui.showToast, 
        triggerAutosave: autosave.triggerAutosave,
        takeSnapshot: history.recordChange,
        executeCommand: commands.executeCommand
    });

    // 7. Subscription Entitlements
    const subscriptionEntitlements = useMemo(() => getSubscriptionEntitlements(user), [user]);

    // 8. AI Feature Layer
    const ai = useEditorAI({
        subscriptionEntitlements,
        showToast: ui.showToast,
        setActiveQuiz: data.setActiveQuiz,
        initializeFromQuiz
    });

    // 9. Import Feature Layer
    const importer = useEditorImport(ui.showToast);

    // ── Derived Data ────────────────────────────────────────────────────────────

    const orderedSlides = useMemo(() => {
        const byId = new Map(slides.map((slide) => [slide.clientId, slide]));
        return order.map((slideId) => byId.get(slideId)).filter(Boolean);
    }, [slides, order]);

    const activeQuestionIndex = useMemo(() => (
        Math.max(0, order.findIndex((slideId) => slideId === activeSlideId))
    ), [order, activeSlideId]);

    const activeQuestion = orderedSlides[activeQuestionIndex] || null;

    // ── Composition ─────────────────────────────────────────────────────────────

    const controllerValue = {
        // Core State
        navigate,
        ...data,
        ...ui,
        ...importer,
        ...ai,
        ...autosave,
        ...history,
        
        // Store State
        slides,
        order,
        activeSlideId,
        config,
        getSnapshot,
        restoreSnapshot,
        initializeFromQuiz,
        setActiveSlideByIndex: useEditorState((state) => state.setActiveSlideByIndex),
        setActiveSlideById: useEditorState((state) => state.setActiveSlideById),
        addSlide: useEditorState((state) => state.addSlide),
        
        // Derived Data
        orderedSlides,
        activeQuestionIndex,
        activeQuestion,
        subscriptionEntitlements,

        // Wrapped Handlers
        ...actions,
        handleDeleteQuestion: (slideId) => ui.showConfirm(
            'Delete this slide permanently?',
            () => {
                actions.deleteSlide(slideId);
                ui.setConfirmDialog(null);
            }
        ),
    };

    return controllerValue;
};

export default usehostEditController;
