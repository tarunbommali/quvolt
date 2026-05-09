// [I18N] Add this single resolver function — call it wherever question is rendered
// Never change existing rendering logic — just wrap the data source

export function resolveQuestionForLanguage(question, lang) {
    if (!lang || !question.translations || !question.translations[lang]) {
        return {
            question: question.text || question.question,   // existing field — fallback
            options: question.options       // existing field — fallback
        }
    }
    return {
        question: question.translations[lang].text || question.translations[lang].question,
        options: question.translations[lang].options
    }
}
