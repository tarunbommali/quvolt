const mongoose = require('mongoose');
const logger = require('../../utils/logger');

/**
 * State Persistence Service
 * Handles database writes with retry logic and transaction support
 */

const { getRedisClient } = require('../../config/redis');

// Failed operations queue key in Redis
const FAILED_OPS_KEY = 'quiz:failed_ops';

const getRedis = () => {
    try {
        return getRedisClient();
    } catch {
        return null;
    }
};

/**
 * Execute a database operation with exponential backoff retry
 * @param {Function} operation - Async function to execute
 * @param {Object} context - Context for logging
 * @param {Number} maxRetries - Maximum retry attempts (default: 3)
 * @param {Object} serialized - Serialized operation for the queue if fully failed
 * @returns {Promise<any>} Operation result
 */
const executeWithRetry = async (operation, context = {}, maxRetries = 3, serialized = null) => {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (error.name === 'ValidationError' || error.name === 'CastError') throw error;
            
            if (attempt < maxRetries) {
                const delayMs = calculateBackoffDelay(attempt);
                await sleep(delayMs);
            }
        }
    }
    
    logger.error('Operation fully failed, sending to Redis queue', context);
    if (serialized) await queueFailedOperation(serialized);
    throw lastError;
};

const calculateBackoffDelay = (attempt) => {
    const baseDelay = 100;
    const maxDelay = 5000;
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    return delay + (Math.random() * 0.3 * delay);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Queue a failed operation for later processing (Redis-backed)
 */
const queueFailedOperation = async (opData) => {
    const client = getRedis();
    const item = { ...opData, queuedAt: Date.now(), retryCount: opData.retryCount || 0 };

    if (client) {
        try {
            await client.rPush(FAILED_OPS_KEY, JSON.stringify(item));
            return;
        } catch (err) {
            logger.error('Redis queue failed', { error: err.message });
        }
    }
    
    if (!global.failedOpsMemoryQueue) global.failedOpsMemoryQueue = [];
    global.failedOpsMemoryQueue.push(item);
};

/**
 * Process queued failed operations from Redis
 */
const processFailedOperationsQueue = async () => {
    const client = getRedis();
    const stats = { processed: 0, succeeded: 0, failed: 0 };
    
    const items = [];
    
    // Pull from Redis
    if (client) {
        try {
            let item;
            while (item = await client.lPop(FAILED_OPS_KEY)) {
                items.push(JSON.parse(item));
            }
        } catch (err) {
            logger.error('Failed to pull ops from Redis', { error: err.message });
        }
    }

    // Pull from memory fallback
    if (global.failedOpsMemoryQueue?.length) {
        items.push(...global.failedOpsMemoryQueue);
        global.failedOpsMemoryQueue = [];
    }

    if (items.length === 0) return stats;

    const Submission = require('../../models/Submission');
    const Quiz = require('../../models/Quiz');
    const QuizSession = require('../../models/QuizSession');

    for (const item of items) {
        stats.processed++;
        let success = false;

        try {
            switch (item.type) {
                case 'persistSubmission':
                    await Submission.create(item.data);
                    success = true;
                    break;
                case 'persistSessionStateTransition':
                    await QuizSession.findOneAndUpdate(
                        { sessionCode: item.data.sessionCode },
                        { status: item.data.newStatus, ...item.data.updates }
                    );
                    success = true;
                    break;
                case 'persistQuizStateTransition':
                    await Quiz.findByIdAndUpdate(item.data.quizId, {
                        status: item.data.newStatus,
                        ...item.data.updates
                    });
                    success = true;
                    break;
                case 'persistSessionUpdates':
                    await QuizSession.findOneAndUpdate({ sessionCode: item.data.sessionCode }, item.data.updates);
                    success = true;
                    break;
            }

            if (success) {
                stats.succeeded++;
                logger.info('Queued operation succeeded', { type: item.type });
            }
        } catch (error) {
            stats.failed++;
            item.retryCount++;

            // Exponential backoff or age-based skip logic
            if (item.retryCount < 5) {
                await queueFailedOperation(item);
            } else {
                logger.error('Queued operation permanently failed (Max Retries)', { 
                    type: item.type, 
                    error: error.message 
                });
            }
        }
    }

    return stats;
};

/**
 * Execute a state transition with MongoDB transaction
 * Falls back to non-transactional execution if transactions are not supported
 * @param {Function} transactionFn - Function that performs the transaction
 * @param {Object} context - Context for logging
 * @returns {Promise<any>} Transaction result
 */
const executeInTransaction = async (transactionFn, context = {}) => {
    // Check if we're in a test environment
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    
    // In test environment, execute without transaction
    if (isTestEnv) {
        logger.debug('Test environment detected, executing without transaction', context);
        return await transactionFn(null);
    }
    
    // Check if transactions are supported (requires replica set)
    const supportsTransactions = mongoose.connection.readyState === 1 && 
                                 mongoose.connection.db?.admin;
    
    if (!supportsTransactions) {
        logger.debug('Transactions not supported, executing without transaction', context);
        // Execute without transaction
        return await transactionFn(null);
    }
    
    const session = await mongoose.startSession();
    
    try {
        session.startTransaction();
        
        logger.debug('Starting transaction', context);
        
        const result = await transactionFn(session);
        
        // Validate state consistency before committing
        await validateStateConsistency(result, context);
        
        await session.commitTransaction();
        
        logger.debug('Transaction committed successfully', context);
        
        return result;
    } catch (error) {
        // Only abort if transaction was started
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        
        logger.error('Transaction aborted', {
            ...context,
            error: error.message,
            stack: error.stack
        });
        
        throw error;
    } finally {
        session.endSession();
    }
};

/**
 * Validate state consistency before committing transaction
 * @param {any} result - Transaction result
 * @param {Object} context - Context for logging
 */
const validateStateConsistency = async (result, context) => {
    // Placeholder for state consistency validation
    // Actual implementation depends on the specific operation
    // For example, verify that session status matches quiz status
    
    if (!result) {
        throw new Error('Transaction result is null or undefined');
    }
    
    logger.debug('State consistency validated', context);
};

/**
 * Persist session state transition with retry logic
 * @param {String} sessionCode - Session code
 * @param {String} newStatus - New status
 * @param {Object} updates - Additional updates
 * @returns {Promise<Object>} Updated session
 */
const persistSessionStateTransition = async (sessionCode, newStatus, updates = {}) => {
    const QuizSession = require('../../models/QuizSession');
    
    const operation = async () => {
        return await executeInTransaction(async (session) => {
            const quizSession = await QuizSession.findOneAndUpdate(
                { sessionCode },
                {
                    status: newStatus,
                    ...updates
                },
                {
                    returnDocument: 'after',
                    session
                }
            );
            
            if (!quizSession) {
                throw new Error(`Session not found: ${sessionCode}`);
            }
            
            return quizSession;
        }, { operation: 'persistSessionStateTransition', sessionCode, newStatus });
    };
    
    return await executeWithRetry(
        operation,
        { operation: 'persistSessionStateTransition', sessionCode, newStatus },
        3,
        { type: 'persistSessionStateTransition', data: { sessionCode, newStatus, updates } }
    );
};

/**
 * Persist generic session updates with retry logic
 * @param {String} sessionCode - Session code
 * @param {Object} updates - Updates to apply
 */
const persistSessionUpdates = async (sessionCode, updates = {}) => {
    const QuizSession = require('../../models/QuizSession');
    const operation = async () => {
        return await QuizSession.findOneAndUpdate({ sessionCode }, updates, { returnDocument: 'after' });
    };
    
    return await executeWithRetry(
        operation,
        { operation: 'persistSessionUpdates', sessionCode },
        3,
        { type: 'persistSessionUpdates', data: { sessionCode, updates } }
    );
};

/**
 * Persist quiz state transition with retry logic
 * @param {String} quizId - Quiz ID
 * @param {String} newStatus - New status
 * @param {Object} updates - Additional updates
 * @returns {Promise<Object>} Updated quiz
 */
const persistQuizStateTransition = async (quizId, newStatus, updates = {}) => {
    const Quiz = require('../../models/Quiz');
    
    const operation = async () => {
        return await executeInTransaction(async (session) => {
            const quiz = await Quiz.findByIdAndUpdate(
                quizId,
                {
                    status: newStatus,
                    ...updates
                },
                {
                    returnDocument: 'after',
                    session
                }
            );
            
            if (!quiz) {
                throw new Error(`Quiz not found: ${quizId}`);
            }
            
            return quiz;
        }, { operation: 'persistQuizStateTransition', quizId, newStatus });
    };
    
    return await executeWithRetry(
        operation,
        { operation: 'persistQuizStateTransition', quizId, newStatus },
        3,
        { type: 'persistQuizStateTransition', data: { quizId, newStatus, updates } }
    );
};

/**
 * Persist submission with retry logic
 * @param {Object} submissionData - Submission data
 * @returns {Promise<Object>} Created submission
 */
const persistSubmission = async (submissionData) => {
    const Submission = require('../../models/Submission');
    
    const operation = async () => {
        return await Submission.create(submissionData);
    };
    
    return await executeWithRetry(
        operation,
        {
            operation: 'persistSubmission',
            userId: submissionData.userId,
            questionId: submissionData.questionId
        },
        3,
        { type: 'persistSubmission', data: submissionData }
    );
};

/**
 * Get failed operations queue size (Redis + Memory)
 * @returns {Promise<Number>} Total queue size
 */
const getQueueSize = async () => {
    const client = getRedis();
    let redisSize = 0;
    if (client) {
        try {
            redisSize = await client.lLen(FAILED_OPS_KEY);
        } catch {}
    }
    
    const memSize = global.failedOpsMemoryQueue?.length || 0;
    return redisSize + memSize;
};

/**
 * Get failed operations queue items (for monitoring)
 * @returns {Promise<Array>} Combined queue items
 */
const getQueue = async () => {
    const client = getRedis();
    const items = [];
    
    if (client) {
        try {
            const redisItems = await client.lRange(FAILED_OPS_KEY, 0, -1);
            items.push(...redisItems.map(JSON.parse));
        } catch {}
    }
    
    if (global.failedOpsMemoryQueue) {
        items.push(...global.failedOpsMemoryQueue);
    }
    
    return items;
};

module.exports = {
    executeWithRetry,
    executeInTransaction,
    persistSessionStateTransition,
    persistSessionUpdates,
    persistQuizStateTransition,
    persistSubmission,
    processFailedOperationsQueue,
    getQueueSize,
    getQueue,
    calculateBackoffDelay
};
