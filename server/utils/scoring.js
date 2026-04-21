/**
 * SaaS-grade Scoring System
 * Requirement 7: basePoints (100) + timeBonus (up to 900)
 * No negative marking per test suite
 */
const calculateScore = (isCorrect, timeTaken, maxTime) => {
    if (!isCorrect) return 0;
    
    const clampedTime = Math.min(Math.max(timeTaken, 0), maxTime);
    const basePoints = 100;
    
    // faster response = higher bonus (remainingTime / totalTime) * 900
    const remainingTime = Math.max(0, maxTime - clampedTime);
    const timeBonus = Math.floor((remainingTime / maxTime) * 900);
    
    return basePoints + timeBonus;
};

module.exports = { calculateScore };
