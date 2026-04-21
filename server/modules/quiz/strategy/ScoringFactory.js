const { StandardScoring, CompetitiveScoring, BinaryScoring } = require('./ScoringStrategy');

/**
 * Scoring Factory (Creational Pattern)
 * Creates the appropriate scoring strategy based on template configuration
 */
class ScoringFactory {
    /**
     * @param {Object} config - Template scoring config snapshot
     * @returns {ScoringStrategy}
     */
    static getStrategy(config) {
        if (!config) return new StandardScoring();

        // 1. Check for negative marking (Competitive)
        if (config.negativeMarking?.enabled) {
            return new CompetitiveScoring(config.negativeMarking.penalty);
        }

        // 2. Check for binary scoring (No speed bonus)
        if (config.speedBonus === false) {
            return new BinaryScoring(config.basePoints || 100);
        }

        // 3. Default to Standard (with speed bonus)
        return new StandardScoring();
    }
}

module.exports = ScoringFactory;
