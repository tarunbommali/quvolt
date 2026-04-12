/**
 * Score for a correct answer: 1000 down to 100, scaled by how fast the
 * participant answered relative to the question's full time limit.
 * Wrong answers always score 0. maxTime is the question's timeLimit in seconds.
 */
const calculateScore = (isCorrect, timeTaken, maxTime) => {
    if (!isCorrect) return 0;
    const clampedTime = Math.min(Math.max(timeTaken, 0), maxTime);
    // 1000 at t=0, 100 at t=maxTime — linear interpolation
    const score = 1000 - ((clampedTime / maxTime) * 900);
    return Math.round(Math.max(100, score));
};

module.exports = { calculateScore };
