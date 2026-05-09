import { resolveSessionRoute } from '../utils/sessionRouteResolver';

describe('resolveSessionRoute', () => {
    it('returns /studio for null or undefined quiz', () => {
        expect(resolveSessionRoute(null)).toBe('/workspace');
        expect(resolveSessionRoute(undefined)).toBe('/workspace');
    });

    it('returns /live/:id for live status', () => {
        expect(resolveSessionRoute({ _id: 'abc', status: 'live' })).toBe('/live/abc');
    });

    it('returns /live/:id for legacy ongoing, in_progress, started, and active statuses', () => {
        const id = 'quiz-1';
        expect(resolveSessionRoute({ _id: id, status: 'ongoing' })).toBe(`/live/${id}`);
        expect(resolveSessionRoute({ _id: id, status: 'in_progress' })).toBe(`/live/${id}`);
        expect(resolveSessionRoute({ _id: id, status: 'started' })).toBe(`/live/${id}`);
        expect(resolveSessionRoute({ _id: id, status: 'active' })).toBe(`/live/${id}`);
    });

    it('returns /invite/:id for waiting status', () => {
        expect(resolveSessionRoute({ _id: 'abc', status: 'waiting' })).toBe('/invite/abc');
    });

    it('returns /invite/:id for scheduled and lobby statuses', () => {
        const id = 'quiz-2';
        expect(resolveSessionRoute({ _id: id, status: 'scheduled' })).toBe(`/invite/${id}`);
        expect(resolveSessionRoute({ _id: id, status: 'lobby' })).toBe(`/invite/${id}`);
    });

    it('returns /quiz/templates/:id/sessions for completed status', () => {
        expect(resolveSessionRoute({ _id: 'abc', status: 'completed' })).toBe('/quiz/templates/abc/sessions');
    });

    it('returns /studio for aborted status', () => {
        expect(resolveSessionRoute({ _id: 'abc', status: 'aborted' })).toBe('/workspace');
    });

    it('returns /launch/quiz/:id for draft or unknown statuses', () => {
        const id = 'quiz-3';
        expect(resolveSessionRoute({ _id: id, status: 'draft' })).toBe(`/launch/quiz/${id}`);
        expect(resolveSessionRoute({ _id: id, status: 'unknown_status' })).toBe(`/launch/quiz/${id}`);
        expect(resolveSessionRoute({ _id: id, status: '' })).toBe(`/launch/quiz/${id}`);
    });

    it('is case-insensitive for status strings', () => {
        const id = 'quiz-4';
        expect(resolveSessionRoute({ _id: id, status: 'LIVE' })).toBe(`/live/${id}`);
        expect(resolveSessionRoute({ _id: id, status: 'Waiting' })).toBe(`/invite/${id}`);
        expect(resolveSessionRoute({ _id: id, status: 'COMPLETED' })).toBe(`/quiz/templates/${id}/sessions`);
    });

    it('handles missing status field as unknown (returns /launch/quiz/:id)', () => {
        expect(resolveSessionRoute({ _id: 'quiz-5' })).toBe('/launch/quiz/quiz-5');
    });
});
