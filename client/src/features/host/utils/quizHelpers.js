/**
 * Utility helpers for quiz template management.
 */

export const isTransientApiError = (error) => {
    return error.code === 'ECONNABORTED' || error.message === 'Network Error';
};

export const getNextCloneTitle = (sourceTitle, existingTitles = []) => {
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

export const parseAllowedEmails = (rawText) => {
    if (!rawText) return [];
    return Array.from(new Set(
        String(rawText)
            .split(/[\n,;]+/)
            .map((value) => value.trim().toLowerCase())
            .filter(Boolean),
    ));
};
