import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useQuizStore } from '../../../stores/useQuizStore';
import useToast from '../../../hooks/useToast';

// Domain Hooks
import useTemplateList from './useTemplateList';
import useTemplateActions from './useTemplateActions';
import useFolderSync from './useFolderSync';

// UI Hooks
import useCreateTemplateForm from './useCreateTemplateForm';
import useStudioUI from './useStudioUI';

// Utils
import { getSubscriptionEntitlements } from '../../../utils/subscriptionEntitlements';
import { prefetchhostEditRoute, prefetchhostLiveRoute } from '../../../utils/routePrefetch';

/**
 * Main Orchestrator Hook for the Studio Dashboard.
 * Composes domain and UI hooks into a single unified interface.
 */
const useStudioDashboardController = () => {
    const { folderId } = useParams();
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();
    const user = useAuthStore((state) => state.user);
    const authLoading = useAuthStore((state) => state.loading);

    // 1. Data Layer
    const list = useTemplateList(folderId);

    // 2. Folder / Navigation Layer
    const folder = useFolderSync(folderId, showToast);

    // 3. UI State Layer
    const ui = useStudioUI();

    // 4. Form State Layer
    const form = useCreateTemplateForm();

    // 5. Entitlements
    const subscriptionEntitlements = useMemo(() => getSubscriptionEntitlements(user), [user]);
    const templateCount = useMemo(
        () => (list.templates || []).filter((t) => t.type === 'template' || t.type === 'quiz').length,
        [list.templates],
    );

    // 6. Action Layer (Business Logic)
    const actions = useTemplateActions({
        templates: list.templates,
        currentSubject: folder.currentSubject,
        refetch: list.refetch,
        showToast,
        setActiveQuiz: useQuizStore.getState().setActiveQuiz,
        navigate,
        setCloning: ui.setCloning,
        setEditingQuizId: ui.setEditingQuizId,
        setEditingTitle: ui.setEditingTitle,
        editingTitle: ui.editingTitle,
        setTemplates: list.setData // Pass the list's setter to the actions
    });

    // ── Navigation Logic (Specific to Dashboard) ──────────────────────────────────

    const prefetchTemplateNavigation = useCallback((template) => {
        const parentId = folder.currentSubject ? folder.currentSubject._id : 'none';
        useQuizStore.getState().prefetchQuizForParent(parentId).catch(() => { });
        if (template?.type === 'subject' && template?._id) {
            useQuizStore.getState().prefetchQuizForParent(template._id).catch(() => { });
        }
        if (template?.type === 'template') {
            prefetchhostEditRoute().catch(() => { });
            prefetchhostLiveRoute().catch(() => { });
        }
    }, [folder.currentSubject]);

    const onOpenSubject = useCallback((subject) => {
        if (!subject?._id) return;
        prefetchTemplateNavigation(subject);
        
        const newBreadcrumbs = [...folder.breadcrumbs, { label: subject.title, id: subject._id }];
        
        navigate(`/studio/folder/${subject._id}`, {
            state: { subject, breadcrumbs: newBreadcrumbs }
        });
    }, [prefetchTemplateNavigation, folder.breadcrumbs, navigate]);

    const onGoLive = useCallback((template) => {
        if (!template?._id) return;
        if (template?.type === 'subject') {
            onOpenSubject(template);
            return;
        }
        prefetchhostLiveRoute().catch(() => { });
        const path = String(template?.status || '').toLowerCase() === 'waiting' ? `/invite/${template._id}` : `/launch/quiz/${template._id}`;
        navigate(path, { state: { quiz: template, forceLaunch: true } });
    }, [onOpenSubject, navigate]);

    // ── Composition ─────────────────────────────────────────────────────────────

    return {
        // Data & State
        ...list,
        ...folder,
        ...ui,
        ...form,
        
        // Entitlements
        subscriptionEntitlements,
        templateCount,
        liveSessionCount: useMemo(
            () => (list.templates || []).filter((t) => ['live', 'waiting'].includes(String(t?.status || '').toLowerCase())).length,
            [list.templates],
        ),

        // Auth
        user,
        authLoading,
        isLoading: authLoading || folder.isLoadingSubject || list.isLoading,

        // Actions
        handleRenameTemplate: actions.renameTemplate,
        createTemplate: () => actions.createTemplate(form, { templateCount, subscriptionEntitlements }),
        cloneTemplate: actions.cloneTemplate,
        handleDeleteTemplate: (id) => ui.showConfirm(
            'All data for this project will be permanently wiped. This cannot be undone.', 
            () => actions.deleteTemplate(id)
        ),
        handlePaidToggle: () => form.handlePaidToggle(subscriptionEntitlements, showToast),
        
        // Navigation Actions
        onOpenSubject,
        onGoLive,
        onEditTemplate: (template) => navigate(`/quiz/templates/${template._id}`, { state: { quiz: template } }),
        prefetchTemplateNavigation,
        
        // Toast
        toast,
        clearToast,
    };
};

export default useStudioDashboardController;
