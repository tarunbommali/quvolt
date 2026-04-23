const { getQuizAnalytics } = require('./quiz.analytics.service');
const { getUserAnalytics } = require('./user.analytics.service');
const { gethostAnalyticsSummary, getRecentSessions } = require('./host.analytics.service');
const { snapshotAnalytics } = require('./analytics.snapshot.service');
const { toObjectId, getPearsonCorrelation } = require('./analytics.utils');
const { getBasicSessionAnalytics, finalizeSessionAnalytics } = require('./session.analytics.service');
const { getQuestionInsights, computeAndPersistQuestionInsights } = require('./question.analytics.service');
const { getAudienceInsights, computeAndPersistAudienceInsights } = require('./audience.analytics.service');
const { getFullSessionAnalytics } = require('./full.analytics.service');

module.exports = {
    // Legacy
    getQuizAnalytics,
    getUserAnalytics,
    gethostAnalyticsSummary,
    getRecentSessions,
    snapshotAnalytics,
    toObjectId,
    getPearsonCorrelation,
    // Session-level (new)
    getBasicSessionAnalytics,
    finalizeSessionAnalytics,
    getQuestionInsights,
    computeAndPersistQuestionInsights,
    getAudienceInsights,
    computeAndPersistAudienceInsights,
    // Unified (plan-aware)
    getFullSessionAnalytics,
};
