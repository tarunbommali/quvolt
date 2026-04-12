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
            return `/invite/${quiz._id}`;
        case 'completed':
            return `/results/${quiz._id}`;
        case 'aborted':
            return '/studio';
        default:
            return `/launch/${quiz._id}`;
    }
}
