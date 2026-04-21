/**
 * scoring.engine.js
 *
 * Template-aware scoring calculation.
 * Replaces the legacy flat scoring.js utility.
 *
 * Usage:
 *   const { calculateScore } = require('./scoring.engine');
 *   const score = calculateScore({ isCorrect, timeTaken, maxTime, config });
 */

/**
 * Calculate the score for a single answer submission.
 *
 * @param {Object} opts
 * @param {boolean} opts.isCorrect       - Whether the selected answer is correct
 * @param {number}  opts.timeTaken       - Seconds taken to answer (0 → maxTime)
 * @param {number}  opts.maxTime         - Question time limit in seconds
 * @param {Object}  [opts.config]        - Template scoring config snapshot
 * @returns {number}                     - Points to add (positive or negative)
 */
const calculateScore = ({ isCorrect, timeTaken, maxTime, config } = {}) => {
    // ── Defaults (matches legacy behaviour when no template is present) ──────
    const basePoints    = config?.basePoints   ?? 100;
    const speedBonus    = config?.speedBonus   ?? true;
    const speedBonusMax = config?.speedBonusMax ?? 50;
    const negativeEnabled = config?.negativeMarking?.enabled ?? false;
    const penalty         = config?.negativeMarking?.penalty  ?? 25;

    if (!isCorrect) {
        return negativeEnabled ? -Math.abs(penalty) : 0;
    }

    // Clamp timeTaken to valid range
    const clampedTime    = Math.min(Math.max(timeTaken ?? 0, 0), maxTime ?? 30);
    const remainingTime  = Math.max(0, (maxTime ?? 30) - clampedTime);
    const timeRatio      = (maxTime ?? 30) > 0 ? remainingTime / (maxTime ?? 30) : 0;
    const bonus          = speedBonus ? Math.floor(timeRatio * speedBonusMax) : 0;

    return basePoints + bonus;
};

/**
 * Build a result summary for a single submission.
 *
 * @param {Object} opts
 * @param {boolean} opts.isCorrect
 * @param {number}  opts.timeTaken
 * @param {number}  opts.maxTime
 * @param {Object}  [opts.config]  - Template scoring config snapshot
 * @param {number}  [opts.currentTotal] - Running total before this answer
 * @returns {Object}
 */
const buildAnswerResult = ({ isCorrect, timeTaken, maxTime, config, currentTotal = 0 }) => {
    const score = calculateScore({ isCorrect, timeTaken, maxTime, config });
    return {
        isCorrect,
        timeTaken: Number(timeTaken.toFixed(2)),
        scoreChange: score,
        totalScore: currentTotal + score,
        // Include config echo so client can show "+100 pts" / "-25 pts"
        basePoints:    config?.basePoints   ?? 100,
        speedBonus:    config?.speedBonus   ?? true,
        negativeMarking: config?.negativeMarking?.enabled ?? false,
    };
};

module.exports = { calculateScore, buildAnswerResult };
