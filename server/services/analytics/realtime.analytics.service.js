const QuestionAnalytics = require('../../models/QuestionAnalytics');

/**
 * Computes the Question Quality Score based on accuracy and speed.
 */
function computeQQS({ accuracy, avgTime }) {
    const accuracyScore = accuracy * 100;
    const speedScore = Math.max(0, 100 - avgTime * 2.5); // normalize: 40s = 0, 0s = 100
    const engagementScore = 100; // Will be penalized by drop-off in the UI or batch job

    return Math.round(
        0.5 * accuracyScore +
        0.3 * engagementScore +
        0.2 * speedScore
    );
}

/**
 * O(1) incremental update for live analytics.
 * Replaces the heavy MongoDB aggregation loop.
 */
async function handleAnswerIncrementalUpdate({
    sessionId,
    questionId,
    questionText,
    selectedOption,
    isCorrect,
    correctOption,
    explanation,
    responseTime
}) {
    // 1. O(1) Atomical Increment
    const incPayload = {
        totalResponses: 1,
        totalTime: responseTime,
    };
    
    if (isCorrect) incPayload.correctCount = 1;
    else incPayload.incorrectCount = 1;
    
    // We increment a Map field (optionCounts.A) to bypass array matching
    incPayload[`optionCounts.${selectedOption}`] = 1;

    // Use findOneAndUpdate to get the updated document atomically
    const doc = await QuestionAnalytics.findOneAndUpdate(
        { sessionId, questionId },
        { 
            $inc: incPayload,
            $setOnInsert: {
                questionText: questionText || '',
                correctOption: correctOption || null,
                explanation: explanation || '',
            }
        },
        { upsert: true, new: true }
    );

    // 2. Derive lightweight values locally
    const accuracy = doc.totalResponses ? (doc.correctCount / doc.totalResponses) : 0;
    const avgResponseTime = doc.totalResponses ? (doc.totalTime / doc.totalResponses) : 0;
    
    const difficulty = Math.round(100 - (accuracy * 100));
    const qqsScore = computeQQS({ accuracy, avgTime: avgResponseTime });

    // Format optionDistribution for the frontend based on the new Map
    const optionDistribution = [];
    if (doc.optionCounts) {
        for (const [option, count] of doc.optionCounts.entries()) {
            optionDistribution.push({
                option,
                count,
                isCorrect: option === doc.correctOption
            });
        }
    }

    // 3. Update the derived fields on the document (fast, targeted $set)
    await QuestionAnalytics.updateOne(
        { _id: doc._id },
        {
            $set: {
                avgResponseTime,
                difficulty,
                qqsScore,
                optionDistribution
            }
        }
    );

    return doc;
}

module.exports = {
    handleAnswerIncrementalUpdate,
    computeQQS
};
