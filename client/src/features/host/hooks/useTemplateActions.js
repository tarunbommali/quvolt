import { useCallback } from 'react';
import {
    addQuestion,
    createQuiz as apiCreateTemplate,
    deleteQuiz as apiDeleteTemplate,
    updateQuiz as apiUpdateTemplate,
} from '../services/host.service';
import { useQuizStore } from '../../../stores/useQuizStore';
import { isTransientApiError, getNextCloneTitle, parseAllowedEmails } from '../utils/quizHelpers';

/**
 * Domain hook for template CRUD operations and optimistic state management.
 */
export const useTemplateActions = ({ 
    templates, 
    currentSubject, 
    refetch, 
    showToast, 
    setActiveQuiz, 
    navigate,
    setCloning,
    setEditingQuizId,
    setEditingTitle,
    editingTitle,
    setTemplates
}) => {

    const handleRenameTemplate = useCallback(async (templateId) => {
        if (!editingTitle.trim()) {
            setEditingQuizId(null);
            return;
        }

        const nextTitle = editingTitle.trim();
        const previousTemplates = templates;
        const optimisticTemplates = templates.map((t) => (t._id === templateId ? { ...t, title: nextTitle } : t));
        const parentId = currentSubject ? currentSubject._id : 'none';

        useQuizStore.getState().setQuizzesForParent(parentId, optimisticTemplates);

        try {
            await apiUpdateTemplate(templateId, { title: nextTitle });
            refetch();
            showToast('Title updated!', 'success');
        } catch (error) {
            useQuizStore.getState().setQuizzesForParent(parentId, previousTemplates);
            showToast(
                isTransientApiError(error)
                    ? 'Temporary network issue. Rename failed after retries.'
                    : 'Failed to rename',
            );
        } finally {
            setEditingQuizId(null);
            setEditingTitle('');
        }
    }, [editingTitle, templates, currentSubject, refetch, showToast, setEditingQuizId, setEditingTitle]);

    const createTemplateAction = useCallback(async (formState, limits) => {
        const { newQuizTitle, quizType, quizMode, accessType, allowedEmailsText, isPaid, quizPrice } = formState;
        const { templateCount, subscriptionEntitlements } = limits;

        if (!newQuizTitle.trim()) {
            showToast('Please enter a title');
            return;
        }

        if (quizType === 'quiz' && templateCount >= subscriptionEntitlements.maxQuizTemplates) {
            showToast(
                `You have reached your ${subscriptionEntitlements.plan} plan limit of ${subscriptionEntitlements.maxQuizTemplates} templates. Upgrade from Billing to create more.`,
            );
            return;
        }

        if (accessType === 'private' && !subscriptionEntitlements.canUsePrivateHosting) {
            showToast('Private session hosting is available on Creator and Teams plans. Upgrade from Billing to continue.');
            return;
        }

        if (quizType === 'template' && isPaid && !subscriptionEntitlements.canCreatePaidQuiz) {
            showToast('Paid template creation is available on Creator and Teams plans. Upgrade from Billing to continue.');
            return;
        }

        const title = newQuizTitle.trim();
        const tempId = `temp-${Date.now()}`;
        const now = new Date().toISOString();
        const optimisticTemplate = {
            _id: tempId,
            title,
            type: quizType, // Now supported natively by backend
            mode: (quizType === 'template' || quizType === 'quiz') ? quizMode : 'auto',
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

        const previousTemplates = templates;
        const optimisticTemplates = [optimisticTemplate, ...(templates || [])];
        const parentId = currentSubject ? currentSubject._id : 'none';

        if (setTemplates) setTemplates(optimisticTemplates);
        useQuizStore.getState().setQuizzesForParent(parentId, optimisticTemplates);

        try {
            const data = await apiCreateTemplate(
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
            if (setTemplates) {
                setTemplates(prev => [data, ...prev.filter(t => t._id !== tempId)]);
            }
            refetch();
            
            if (data.type === 'template' || data.type === 'quiz') {
                setActiveQuiz(data);
                // Optional: navigate(`/quiz/templates/${data._id}`); 
            }
        } catch (error) {
            useQuizStore.getState().setQuizzesForParent(parentId, previousTemplates);
            const message = error.response?.data?.message ||
                (isTransientApiError(error)
                    ? 'Temporary network issue. Create failed after retries.'
                    : 'Failed to create template');
            showToast(message);
        }
    }, [templates, currentSubject, refetch, showToast, setActiveQuiz, navigate]);

    const cloneTemplate = useCallback(async (source) => {
        if (!source) {
            showToast('Source template not found');
            return;
        }

        const nextTitle = getNextCloneTitle(source.title, (templates || []).map((t) => t.title));

        setCloning(true);
        try {
            const created = await apiCreateTemplate(
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

            if ((source.type === 'quiz' || source.type === 'template') && Array.isArray(source.questions) && source.questions.length > 0) {
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

            refetch();
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
    }, [templates, currentSubject, refetch, showToast, setCloning]);

    const deleteTemplate = useCallback((templateId) => {
        const previousTemplates = templates;
        const parentId = currentSubject ? currentSubject._id : 'none';
        const optimisticTemplates = (templates || []).filter((t) => t._id !== templateId);
        useQuizStore.getState().setQuizzesForParent(parentId, optimisticTemplates);

        try {
            apiDeleteTemplate(templateId).then(() => {
                refetch();
                showToast('Template deleted', 'success');
            }).catch(error => {
                useQuizStore.getState().setQuizzesForParent(parentId, previousTemplates);
                showToast(
                    isTransientApiError(error)
                        ? 'Temporary network issue. Delete failed after retries.'
                        : 'Failed to delete template',
                );
            });
        } catch (error) {
            useQuizStore.getState().setQuizzesForParent(parentId, previousTemplates);
        }
    }, [templates, currentSubject, refetch, showToast]);

    return {
        createTemplate: createTemplateAction,
        renameTemplate: handleRenameTemplate,
        cloneTemplate,
        deleteTemplate
    };
};

export default useTemplateActions;
