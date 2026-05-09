import { useState, useCallback } from 'react';
import { generateAIQuiz } from '../../services/host.service';
import { useEditorState } from '../../../../stores/useEditorState';

/**
 * Domain hook for AI-powered quiz generation features in the editor.
 */
export const useEditorAI = ({ 
    subscriptionEntitlements, 
    showToast, 
    setActiveQuiz, 
    initializeFromQuiz 
}) => {
    const [aiDialogOpen, setAIDialogOpen] = useState(false);

    const ensureAiAccess = useCallback(() => {
        if (!subscriptionEntitlements.canUseAiGeneration) {
            throw new Error('AI quiz generation is available on Creator and Teams plans. Upgrade from Billing to continue.');
        }
    }, [subscriptionEntitlements.canUseAiGeneration]);

    const handleOpenAIDialog = useCallback(() => {
        if (!subscriptionEntitlements.canUseAiGeneration) {
            showToast('AI quiz generation is available on Creator and Teams plans. Upgrade from Billing to continue.');
            return;
        }
        setAIDialogOpen(true);
    }, [subscriptionEntitlements.canUseAiGeneration, showToast]);

    const handleAIGenerate = useCallback(async ({ topic, count, distribution }) => {
        ensureAiAccess();
        return generateAIQuiz({ topic, count, distribution });
    }, [ensureAiAccess]);

    const handleAISave = useCallback(async ({ quizId, questions }) => {
        ensureAiAccess();
        const result = await generateAIQuiz({ quizId, questions, persist: true });
        if (result?.quiz) {
            setActiveQuiz(result.quiz);
            initializeFromQuiz(result.quiz);
            showToast(`Saved ${result.savedCount || questions.length} AI question(s)`, 'success');
        }
        return result;
    }, [ensureAiAccess, setActiveQuiz, initializeFromQuiz, showToast]);

    return {
        aiDialogOpen,
        setAIDialogOpen,
        handleOpenAIDialog,
        handleAIGenerate,
        handleAISave
    };
};

export default useEditorAI;
