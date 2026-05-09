import { useState, useCallback } from 'react';

/**
 * UI hook for managing the state of the Create Template panel/form.
 */
export const useCreateTemplateForm = () => {
    const [newQuizTitle, setNewQuizTitle] = useState('');
    const [quizType, setQuizType] = useState('template');
    const [accessType, setAccessType] = useState('public');
    const [allowedEmailsText, setAllowedEmailsText] = useState('');
    const [quizMode, setQuizMode] = useState('auto');
    const [isPaid, setIsPaid] = useState(false);
    const [quizPrice, setQuizPrice] = useState('');

    const handlePaidToggle = useCallback((entitlements, showToast) => {
        if (!entitlements.canCreatePaidQuiz) {
            showToast('Paid template creation is available on Creator and Teams plans. Upgrade from Billing to continue.');
            return;
        }
        setIsPaid((prev) => !prev);
    }, []);

    const resetForm = useCallback(() => {
        setNewQuizTitle('');
        setQuizType('quiz');
        setAccessType('public');
        setAllowedEmailsText('');
        setQuizMode('auto');
        setIsPaid(false);
        setQuizPrice('');
    }, []);

    return {
        newQuizTitle,
        setNewQuizTitle,
        quizType,
        setQuizType,
        accessType,
        setAccessType,
        allowedEmailsText,
        setAllowedEmailsText,
        quizMode,
        setQuizMode,
        isPaid,
        setIsPaid,
        quizPrice,
        setQuizPrice,
        handlePaidToggle,
        resetForm
    };
};

export default useCreateTemplateForm;
