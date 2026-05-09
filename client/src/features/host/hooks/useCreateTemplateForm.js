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

    const resetForm = useCallback(() => {
        setNewQuizTitle('');
        setQuizType('quiz');
        setAccessType('public');
        setAllowedEmailsText('');
        setQuizMode('auto');
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
        resetForm,
    };
};

export default useCreateTemplateForm;
