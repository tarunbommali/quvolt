/**
 * Failed Job Retry Worker
 * 
 * Polls the FailedJob collection periodically and retries jobs with exponential backoff.
 * This is a lightweight alternative to BullMQ that requires no additional infrastructure.
 * 
 * For higher throughput, replace with BullMQ + Redis queues.
 */
const FailedJob = require('../models/FailedJob');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');

const POLLING_INTERVAL_MS = 60_000; // 1 minute
const MAX_ATTEMPTS = 5;

/**
 * Process a single failed webhook job.
 */
const retryWebhookJob = async (job) => {
    const { event, payload } = job.payload;
    const paymentEntity = payload?.payload?.payment?.entity;

    logger.info('RetryWorker: retrying webhook job', {
        jobId: job._id,
        event,
        idempotencyKey: job.idempotencyKey,
        attempt: job.attempts,
    });

    if (event === 'payment.captured' && paymentEntity) {
        const updated = await Payment.findOneAndUpdate(
            { razorpayOrderId: paymentEntity.order_id, status: { $ne: 'completed' } },
            {
                $set: {
                    razorpayPaymentId: paymentEntity.id,
                    status: 'completed',
                },
            },
            { new: true }
        );
        if (!updated) {
            logger.info('RetryWorker: payment already completed, marking job resolved', { jobId: job._id });
        } else {
            logger.info('RetryWorker: payment reconciled via retry', { jobId: job._id, orderId: paymentEntity.order_id });
        }
    }
    // Add more event types here as needed
};

/**
 * Main retry loop.
 */
const processFailedJobs = async () => {
    const now = new Date();

    // Find jobs ready for retry
    const jobs = await FailedJob.find({
        status: { $in: ['pending', 'retrying'] },
        $or: [
            { nextRetryAt: null },
            { nextRetryAt: { $lte: now } },
        ],
    }).limit(20).lean();

    if (jobs.length > 0) {
        logger.info(`RetryWorker: processing ${jobs.length} failed job(s)`);
    }

    for (const jobDoc of jobs) {
        const job = await FailedJob.findById(jobDoc._id);
        if (!job) continue;

        try {
            job.status = 'retrying';
            await job.save();

            if (job.type === 'webhook') {
                await retryWebhookJob(job);
            }

            job.status = 'resolved';
            job.resolvedAt = new Date();
            await job.save();
        } catch (err) {
            logger.error('RetryWorker: job retry failed', {
                jobId: job._id,
                attempt: job.attempts,
                error: err.message,
            });

            job.attempts += 1;
            job.error = { message: err.message, stack: err.stack };

            if (job.attempts >= MAX_ATTEMPTS) {
                job.status = 'dead_letter';
                logger.error('RetryWorker: job moved to dead_letter queue', {
                    jobId: job._id,
                    type: job.type,
                    idempotencyKey: job.idempotencyKey,
                });
            } else {
                job.status = 'pending';
                // Exponential backoff: 1m, 2m, 4m, 8m
                const delayMs = 60_000 * Math.pow(2, job.attempts - 1);
                job.nextRetryAt = new Date(Date.now() + delayMs);
            }

            await job.save();
        }
    }
};

/**
 * Start the retry worker poll loop.
 * Only call on one instance in a clustered deployment.
 */
const initFailedJobWorker = () => {
    logger.info('RetryWorker: starting failed job polling loop');
    
    // Initial run after 30 seconds to let the service warm up
    setTimeout(() => {
        processFailedJobs().catch(err =>
            logger.error('RetryWorker: initial run failed', { error: err.message })
        );
    }, 30_000);

    setInterval(() => {
        processFailedJobs().catch(err =>
            logger.error('RetryWorker: poll failed', { error: err.message })
        );
    }, POLLING_INTERVAL_MS);
};

module.exports = { initFailedJobWorker, processFailedJobs };
