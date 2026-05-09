/**
 * Utility helpers for the host quiz editor.
 */

export const buildImportedQuestions = (payload) => {
    const source = Array.isArray(payload)
        ? payload
        : payload?.questions || payload?.slides || payload?.items || payload?.data;

    if (!Array.isArray(source)) {
        throw new Error('Paste a JSON array or an object with a questions/slides array.');
    }

    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

    return source.map((slide, index) => {
        let text = String(slide?.text ?? slide?.question ?? slide?.title ?? '').trim();
        text = capitalize(text);

        const optionsSource = Array.isArray(slide?.options)
            ? slide.options
            : Array.isArray(slide?.answers)
                ? slide.answers
                : Array.isArray(slide?.choices)
                    ? slide.choices
                    : [];

        const options = optionsSource
            .map((option) => String(option ?? '').trim())
            .filter(Boolean)
            .map(capitalize);

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

export const categorizeSaveError = (error) => {
    const status = error?.response?.status;
    if (!error?.response) {
        return { 
            type: 'network', 
            title: 'Network error', 
            message: 'Connection issue while saving. Retry once network is stable.' 
        };
    }
    if (status === 400 || status === 422) {
        return { 
            type: 'validation', 
            title: 'Validation error', 
            message: error?.response?.data?.message || 'Invalid editor data. Review slide fields.' 
        };
    }
    return { 
        type: 'sync', 
        title: 'Realtime sync error', 
        message: error?.response?.data?.message || 'Unable to synchronize full editor state.' 
    };
};
