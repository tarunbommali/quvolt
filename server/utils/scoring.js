/**
 * SaaS-grade Scoring System
 * Requirement 7: basePoints (100) + timeBonus (up to 50)
 * Wrong answers: -25 penalty
 */
const calculateScore = (isCorrect, timeTaken, maxTime) => {
    if (!isCorrect) return -25; // Negative marking for wrong answers
    
    const clampedTime = Math.min(Math.max(timeTaken, 0), maxTime);
    const basePoints = 100;
    
    // faster response = higher bonus (remainingTime / totalTime) * 50
    const remainingTime = Math.max(0, maxTime - clampedTime);
    const timeBonus = Math.floor((remainingTime / maxTime) * 50);
    
    return basePoints + timeBonus;
};

module.exports = { calculateScore };
