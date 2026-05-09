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
import useWorkspaceUI from './useWorkspaceUI';

// Utils
import { getSubscriptionEntitlements } from '../../../utils/subscriptionEntitlements';
import { prefetchhostEditRoute, prefetchhostLiveRoute } from '../../../utils/routePrefetch';

/**
 * Main Orchestrator Hook for the Workspace Dashboard.
 * Composes domain and UI hooks into a single unified interface.
 */
const useWorkspaceDashboardController = () => {
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
    const ui = useWorkspaceUI();

    // 4. Form State Layer
    const form = useCreateTemplateForm();

    // 5. Entitlements
    const subscriptionEntitlements = useMemo(() => getSubscriptionEntitlements(user), [user]);
    const itemCount = useMemo(
        () => (list.templates || []).length,
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
        if (template?.type !== 'quiz' && template?._id) {
            useQuizStore.getState().prefetchQuizForParent(template._id).catch(() => { });
        }
        if (template?.type === 'quiz' || template?.type === 'template') {
            prefetchhostEditRoute().catch(() => { });
            prefetchhostLiveRoute().catch(() => { });
        }
    }, [folder.currentSubject]);

    const onOpenSubject = useCallback((subject) => {
        if (!subject?._id) return;
        prefetchTemplateNavigation(subject);
        
        const newBreadcrumbs = [...folder.breadcrumbs, { label: subject.title, id: subject._id }];
        
        navigate(`/workspace/collection/${subject._id}`, {
            state: { subject, breadcrumbs: newBreadcrumbs }
        });
    }, [prefetchTemplateNavigation, folder.breadcrumbs, navigate]);

    const onGoLive = useCallback((template) => {
        if (!template?._id) return;
        if (template?.type !== 'quiz') {
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
        itemCount,
        templateCount: itemCount,
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
        createTemplate: () => actions.createTemplate(form, { templateCount: itemCount, subscriptionEntitlements }),
        cloneTemplate: actions.cloneTemplate,
        handleDeleteTemplate: (id) => ui.showConfirm(
            'All data for this content will be permanently wiped. This cannot be undone.', 
            () => actions.deleteTemplate(id)
        ),
        
        handleToggleMasteryMode: async () => {
            if (!folderId || !folder.currentSubject) return;
            const isCurrentlyEnabled = folder.currentSubject.leaderboard?.groupBy === 'unit';
            try {
                const response = await axios.put(`/api/quiz/${folderId}`, {
                    leaderboard: {
                        ...folder.currentSubject.leaderboard,
                        groupBy: isCurrentlyEnabled ? 'default' : 'unit'
                    }
                });
                if (response.data.success) {
                    folder.setCurrentSubject(response.data.data);
                    showToast(`Modular Mode ${isCurrentlyEnabled ? 'disabled' : 'enabled'}`, 'success');
                }
            } catch (err) {
                showToast('Failed to update collection settings', 'error');
            }
        },

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

export default useWorkspaceDashboardController;
