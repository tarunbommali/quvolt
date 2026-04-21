const ScoringFactory = require('./strategy/ScoringFactory');

/**
 * Question Engine
 * Handles answer validation, scoring, and statistics
 */
class QuestionEngine {
    constructor() {
        this.strategies = new Map(); // Cache strategies per session if needed
    }

    /**
     * Validate and score an answer
     * @param {Object} params
     * @param {string} params.selectedOption
     * @param {string} params.hashedCorrectAnswer
     * @param {number} params.timeTaken
     * @param {number} params.maxTime
     * @param {Object} params.config - Template scoring config
     */
    processAnswer({ selectedOption, hashedCorrectAnswer, timeTaken, maxTime, config }) {
        const { compareAnswers } = require('../../utils/crypto');
        const isCorrect = compareAnswers(selectedOption, hashedCorrectAnswer);
        
        // Strategy Pattern: Resolve scoring algorithm
        const strategy = ScoringFactory.getStrategy(config);
        const score = strategy.calculate({ isCorrect, timeTaken, maxTime });

        return {
            isCorrect,
            score,
            timeTaken
        };
    }

    /**
     * Update question statistics
     */
    updateStats(currentStats, { selectedOption, isCorrect, timeTaken, userId, userName, score }) {
        const selectedKey = String(selectedOption);
        
        if (!currentStats.optionCounts[selectedKey]) {
            currentStats.optionCounts[selectedKey] = 0;
        }
        currentStats.optionCounts[selectedKey] += 1;
        currentStats.totalAnswers = (currentStats.totalAnswers || 0) + 1;

        if (!currentStats.fastestUser || timeTaken < currentStats.fastestUser.timeTaken) {
            currentStats.fastestUser = {
                userId,
                name: userName,
                timeTaken,
                answer: selectedOption,
                score,
                isCorrect,
            };
        }

        return currentStats;
    }
}

module.exports = new QuestionEngine();
