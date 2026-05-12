// [I18N] Language resolver — single source of truth for question localization.
// Fallback chain: preferredLang → defaultLang → raw question fields.
// Never change existing rendering logic — just wrap the data source.

/**
 * Resolves a question's text and options for the given language.
 *
 * @param {Object|null} question  - The question payload (from socket or API).
 * @param {string|null} lang      - Participant's preferred language code (e.g. 'hi').
 * @param {string}      [defaultLang='en'] - Quiz-level default language (fallback).
 * @returns {{ question: string, options: string[] }}
 */
export function resolveQuestionForLanguage(question, lang, defaultLang = 'en') {
    if (!question) {
        return { question: '', options: [] };
    }

    const translations = question.translations || {};

    // 1. Try participant's preferred language
    if (lang && translations[lang]?.text) {
        return {
            question: translations[lang].text,
            options: translations[lang].options || question.options || [],
        };
    }

    // 2. Fallback to quiz's default language (if different from base fields)
    if (defaultLang && defaultLang !== 'en' && translations[defaultLang]?.text) {
        return {
            question: translations[defaultLang].text,
            options: translations[defaultLang].options || question.options || [],
        };
    }

    // 3. Fallback to raw question fields (original / default language content)
    return {
        question: question.text || question.question || '',
        options: question.options || [],
    };
}

/**
 * Resolves a quiz's title and description for the given language.
 *
 * @param {Object|null} quiz       - The quiz object.
 * @param {string|null} lang       - Preferred language code.
 * @returns {{ title: string, description: string }}
 */
export function resolveQuizMetaForLanguage(quiz, lang) {
    if (!quiz) return { title: '', description: '' };

    const translations = quiz.translations || {};
    const defaultLang = quiz.defaultLanguage || 'en';

    // Try preferred language
    if (lang && translations[lang]?.title) {
        return {
            title: translations[lang].title,
            description: translations[lang].description || quiz.description || '',
        };
    }

    // Try default language
    if (defaultLang !== 'en' && translations[defaultLang]?.title) {
        return {
            title: translations[defaultLang].title,
            description: translations[defaultLang].description || quiz.description || '',
        };
    }

    return {
        title: quiz.title || '',
        description: quiz.description || '',
    };
}
