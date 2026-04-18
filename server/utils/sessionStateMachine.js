const SESSION_STATUS = Object.freeze({
    DRAFT: 'draft',
    SCHEDULED: 'scheduled',
    WAITING: 'waiting',
    LIVE: 'live',
    COMPLETED: 'completed',
    ABORTED: 'aborted',
});

const LEGACY_STATUS_MAP = Object.freeze({
    upcoming: SESSION_STATUS.DRAFT,
    ongoing: SESSION_STATUS.WAITING,
});

const normalizeSessionStatus = (status) => {
    if (!status) return status;
    return LEGACY_STATUS_MAP[status] || status;
};

const TRANSITIONS = Object.freeze({
    [SESSION_STATUS.DRAFT]: new Set([SESSION_STATUS.SCHEDULED, SESSION_STATUS.WAITING, SESSION_STATUS.ABORTED]),
    [SESSION_STATUS.SCHEDULED]: new Set([SESSION_STATUS.WAITING, SESSION_STATUS.ABORTED]),
    [SESSION_STATUS.WAITING]: new Set([SESSION_STATUS.LIVE, SESSION_STATUS.ABORTED]),
    [SESSION_STATUS.LIVE]: new Set([SESSION_STATUS.COMPLETED, SESSION_STATUS.ABORTED]),
    [SESSION_STATUS.COMPLETED]: new Set([]), // No transitions allowed from completed state
    [SESSION_STATUS.ABORTED]: new Set([SESSION_STATUS.WAITING]), // Allow restarting aborted sessions
});

const canTransition = (from, to) => {
    const normalizedFrom = normalizeSessionStatus(from);
    const normalizedTo = normalizeSessionStatus(to);

    if (!normalizedFrom || normalizedFrom === normalizedTo) return true;
    return TRANSITIONS[normalizedFrom]?.has(normalizedTo) || false;
};

const assertTransition = (from, to, context = 'session') => {
    const normalizedFrom = normalizeSessionStatus(from);
    const normalizedTo = normalizeSessionStatus(to);

    if (!canTransition(normalizedFrom, normalizedTo)) {
        const error = new Error(`Invalid ${context} state transition: ${normalizedFrom} -> ${normalizedTo}`);
        error.code = 'INVALID_SESSION_TRANSITION';
        throw error;
    }
};

const assertWaitingSessionExists = (session) => {
    if (!session) {
        const error = new Error('Cannot join waiting without session');
        error.code = 'WAITING_SESSION_REQUIRED';
        throw error;
    }
};

module.exports = {
    SESSION_STATUS,
    normalizeSessionStatus,
    canTransition,
    assertTransition,
    assertWaitingSessionExists,
};
