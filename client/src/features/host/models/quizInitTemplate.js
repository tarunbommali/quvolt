import { parseAllowedEmails } from '../utils/quizHelpers';

/**
 * buildOptimisticQuiz
 *
 * Factory that produces a locally-optimistic quiz object for immediate UI
 * feedback while the real API call is in-flight.
 *
 * @param {object} params
 * @param {string} params.title        - Sanitized quiz title.
 * @param {string} params.quizType     - 'quiz' | 'template' | 'subject'
 * @param {string} params.quizMode     - 'auto' | 'tutor'
 * @param {string} params.accessType   - 'public' | 'private'
 * @param {string} params.allowedEmailsText - Raw comma-separated email list (private quizzes).
 * @returns {object} Optimistic quiz document (client-side only until confirmed by the API).
 */
export const buildOptimisticQuiz = ({
    title,
    quizType,
    quizMode,
    accessType,
    allowedEmailsText,
}) => {
    const now = new Date().toISOString();
    const resolvedMode =
        quizType === 'template' || quizType === 'quiz' ? quizMode : 'auto';

    return {
        _id: `temp-${Date.now()}`,
        title,
        type: quizType,
        mode: resolvedMode,
        accessType,
        allowedEmails:
            accessType === 'private' ? parseAllowedEmails(allowedEmailsText) : [],
        status: 'draft',
        createdAt: now,
        updatedAt: now,
        questions: [],
        sessionCount: 0,
        subDirectoryCount: 0,
    };
};
