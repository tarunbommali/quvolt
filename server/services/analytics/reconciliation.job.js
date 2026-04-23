const { 
    finalizeSessionAnalytics, 
    computeAndPersistQuestionInsights 
} = require('./analytics.service');
const QuizSession = require('../../models/QuizSession');
const logger = require('../../utils/logger');

/**
 * Periodic Reconciliation Job.
 * Mitigates data drift that can happen when socket events are dropped or workers fail.
 * Runs every 10 minutes and trues-up analytics for sessions that are currently active
 * or recently ended.
 */
const runReconciliation = async () => {
    try {
        const start = Date.now();
        // Find sessions that started recently (last 12 hours) but aren't strictly finalized
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
        
        const sessions = await QuizSession.find({
            startedAt: { $gte: twelveHoursAgo },
        }).select('_id sessionCode').lean();

        if (sessions.length === 0) return;

        let reconciledCount = 0;
        for (const session of sessions) {
            const sid = session._id.toString();
            // Recompute from truth source (Submissions collection)
            await Promise.allSettled([
                finalizeSessionAnalytics(sid),
                computeAndPersistQuestionInsights(sid)
            ]);
            reconciledCount++;
        }

        logger.info('ANALYTICS_RECONCILIATION_COMPLETE', { 
            reconciledCount, 
            duration: Date.now() - start 
        });
    } catch (error) {
        logger.error('ANALYTICS_RECONCILIATION_ERROR', { error: error.message });
    }
};

let reconciliationInterval;
const startReconciliationJob = () => {
    if (reconciliationInterval) return;
    // Run every 10 minutes
    reconciliationInterval = setInterval(() => {
        runReconciliation().catch(err => logger.error('Reconciliation catch block', err));
    }, 10 * 60 * 1000); 
    logger.info('Started Periodic Analytics Reconciliation Job (10m interval)');
};

module.exports = { startReconciliationJob, runReconciliation };
