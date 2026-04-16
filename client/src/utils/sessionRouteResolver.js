export function resolveSessionRoute(quiz) {
    if (!quiz) return '/studio';
    const status = String(quiz.status || '').toLowerCase();
    switch (status) {
        case 'live':
        case 'ongoing':
        case 'in_progress':
        case 'started':
        case 'active':
            return `/live/${quiz._id}`;
        case 'waiting':
        case 'scheduled':
        case 'lobby':
            return `/quiz/templates/${quiz._id}/session`;
        case 'completed':
            return `/quiz/templates/${quiz._id}/sessions`;
        case 'aborted':
            return '/studio';
        default:
            return `/launch/quiz/${quiz._id}`;
    }
}
