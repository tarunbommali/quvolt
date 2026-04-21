/**
 * Abstract Scoring Strategy
 */
class ScoringStrategy {
    /**
     * @param {Object} params
     * @param {boolean} params.isCorrect
     * @param {number} params.timeTaken (ms)
     * @param {number} params.maxTime (ms)
     */
    calculate({ isCorrect, timeTaken, maxTime }) {
        throw new Error('ScoringStrategy.calculate must be implemented');
    }
}

/**
 * Standard SaaS Scoring
 * Base Points (100) + Time Bonus (up to 900)
 */
class StandardScoring extends ScoringStrategy {
    calculate({ isCorrect, timeTaken, maxTime }) {
        if (!isCorrect) return 0;
        
        const clampedTime = Math.min(Math.max(timeTaken, 0), maxTime);
        const basePoints = 100;
        
        const remainingTime = Math.max(0, maxTime - clampedTime);
        const timeBonus = Math.floor((remainingTime / maxTime) * 900);
        
        return basePoints + timeBonus;
    }
}

/**
 * Competitive Scoring with Negative Marking
 */
class CompetitiveScoring extends ScoringStrategy {
    constructor(negativeMark = -25) {
        super();
        this.negativeMark = negativeMark;
    }

    calculate({ isCorrect, timeTaken, maxTime }) {
        if (!isCorrect) return this.negativeMark;
        
        const standard = new StandardScoring();
        return standard.calculate({ isCorrect, timeTaken, maxTime });
    }
}

/**
 * Binary Scoring (Fixed points, no time bonus)
 */
class BinaryScoring extends ScoringStrategy {
    constructor(points = 100) {
        super();
        this.points = points;
    }

    calculate({ isCorrect }) {
        return isCorrect ? this.points : 0;
    }
}

module.exports = {
    ScoringStrategy,
    StandardScoring,
    CompetitiveScoring,
    BinaryScoring
};
