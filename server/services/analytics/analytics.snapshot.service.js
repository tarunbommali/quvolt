const Analytics = require('../../models/Analytics');

/**
 * Persists a computed analytics payload to the database to prevent redundant heavy aggregations.
 */
const snapshotAnalytics = async ({ type, quizId = null, userId = null, payload }) => {
    // Basic TTL/Freshness check could be added here in the future
    await Analytics.findOneAndUpdate(
        { type, quizId, userId },
        { payload, generatedAt: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true },
    );
};

module.exports = {
    snapshotAnalytics,
};
