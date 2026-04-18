const mongoose = require('mongoose');
const logger = require('../../utils/logger');

/**
 * State Persistence Service
 * Handles database writes with retry logic and transaction support
 */

// Failed operations queue
const failedOperationsQueue = [];

/**
 * Execute a database operation with exponential backoff retry
 * @param {Function} operation - Async function to execute
 * @param {Object} context - Context for logging
 * @param {Number} maxRetries - Maximum retry attempts (default: 3)
 * @returns {Promise<any>} Operation result
 */
const executeWithRetry = async (operation, context = {}, maxRetries = 3) => {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await operation();
            
            if (attempt > 1) {
                logger.info('Operation succeeded after retry', {
                    ...context,
                    attempt,
                    totalAttempts: maxRetries
                });
            }
            
            return result;
        } catch (error) {
            lastError = error;
            
            logger.warn('Operation failed, will retry', {
                ...context,
                attempt,
                maxRetries,
                error: error.message
            });
            
            // Don't retry on validation errors or other non-transient errors
            if (error.name === 'ValidationError' || error.name === 'CastError') {
                throw error;
            }
            
            // If this isn't the last attempt, wait before retrying
            if (attempt < maxRetries) {
                const delayMs = calculateBackoffDelay(attempt);
                await sleep(delayMs);
            }
        }
    }
    
    // All retries failed, queue the operation
    logger.error('Operation failed after all retries', {
        ...context,
        attempts: maxRetries,
        error: lastError.message
    });
    
    queueFailedOperation(operation, context);
    throw lastError;
};

/**
 * Calculate exponential backoff delay
 * @param {Number} attempt - Current attempt number (1-indexed)
 * @returns {Number} Delay in milliseconds
 */
const calculateBackoffDelay = (attempt) => {
    // Exponential backoff: 100ms, 200ms, 400ms, etc.
    const baseDelay = 100;
    const maxDelay = 5000;
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay;
    return delay + jitter;
};

/**
 * Sleep for specified milliseconds
 * @param {Number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Queue a failed operation for later processing
 * @param {Function} operation - Failed operation
 * @param {Object} context - Operation context
 */
const queueFailedOperation = (operation, context) => {
    failedOperationsQueue.push({
        operation,
        context,
        queuedAt: Date.now(),
        retryCount: 0
    });
    
    logger.info('Operation queued for later processing', {
        ...context,
        queueSize: failedOperationsQueue.length
    });
};

/**
 * Process queued failed operations
 * Should be called periodically by a background job
 * @returns {Promise<Object>} Processing statistics
 */
const processFailedOperationsQueue = async () => {
    if (failedOperationsQueue.length === 0) {
        return { processed: 0, succeeded: 0, failed: 0 };
    }
    
    logger.info('Processing failed operations queue', {
        queueSize: failedOperationsQueue.length
    });
    
    const stats = {
        processed: 0,
        succeeded: 0,
        failed: 0
    };
    
    const operations = [...failedOperationsQueue];
    failedOperationsQueue.length = 0; // Clear queue
    
    for (const item of operations) {
        stats.processed++;
        
        try {
            await item.operation();
            stats.succeeded++;
            
            logger.info('Queued operation succeeded', {
                ...item.context,
                retryCount: item.retryCount,
                queuedDuration: Date.now() - item.queuedAt
            });
        } catch (error) {
            stats.failed++;
            item.retryCount++;
            
            // Re-queue if not too old (max 1 hour in queue)
            const queuedDuration = Date.now() - item.queuedAt;
            if (queuedDuration < 60 * 60 * 1000 && item.retryCount < 10) {
                failedOperationsQueue.push(item);
                
                logger.warn('Queued operation failed, re-queuing', {
                    ...item.context,
                    retryCount: item.retryCount,
                    error: error.message
                });
            } else {
                logger.error('Queued operation permanently failed', {
                    ...item.context,
                    retryCount: item.retryCount,
                    queuedDuration,
                    error: error.message
                });
            }
        }
    }
    
    logger.info('Failed operations queue processing completed', stats);
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
        {
            operation: 'persistSessionStateTransition',
            sessionCode,
            newStatus
        }
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
        {
            operation: 'persistQuizStateTransition',
            quizId,
            newStatus
        }
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
        }
    );
};

/**
 * Get failed operations queue size
 * @returns {Number} Queue size
 */
const getQueueSize = () => failedOperationsQueue.length;

/**
 * Get failed operations queue (for monitoring)
 * @returns {Array} Queue items
 */
const getQueue = () => [...failedOperationsQueue];

module.exports = {
    executeWithRetry,
    executeInTransaction,
    persistSessionStateTransition,
    persistQuizStateTransition,
    persistSubmission,
    processFailedOperationsQueue,
    getQueueSize,
    getQueue,
    calculateBackoffDelay
};
