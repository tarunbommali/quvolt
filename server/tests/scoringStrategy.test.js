const ScoringFactory = require('../modules/quiz/strategy/ScoringFactory');
const { StandardScoring, CompetitiveScoring, BinaryScoring } = require('../modules/quiz/strategy/ScoringStrategy');

describe('Scoring Engine (Strategy Pattern)', () => {
    describe('StandardScoring', () => {
        const strategy = new StandardScoring();
        const maxTime = 10000; // 10s

        test('returns 0 for incorrect answer', () => {
            expect(strategy.calculate({ isCorrect: false, timeTaken: 1000, maxTime })).toBe(0);
        });

        test('calculates score with time bonus (fast answer)', () => {
            // Very fast answer (0s) -> 100 + 900 = 1000
            const score = strategy.calculate({ isCorrect: true, timeTaken: 0, maxTime });
            expect(score).toBe(1000);
        });

        test('calculates score with time bonus (slow answer)', () => {
            // Half time (5s) -> 100 + 450 = 550
            const score = strategy.calculate({ isCorrect: true, timeTaken: 5000, maxTime });
            expect(score).toBe(550);
        });

        test('returns base points only when time is up', () => {
            const score = strategy.calculate({ isCorrect: true, timeTaken: 10000, maxTime });
            expect(score).toBe(100);
        });

        test('clamped time prevents negative bonus', () => {
            const score = strategy.calculate({ isCorrect: true, timeTaken: 15000, maxTime });
            expect(score).toBe(100);
        });
    });

    describe('CompetitiveScoring (Negative Marking)', () => {
        const strategy = new CompetitiveScoring(-50);
        const maxTime = 10000;

        test('applies penalty for wrong answer', () => {
            expect(strategy.calculate({ isCorrect: false, timeTaken: 1000, maxTime })).toBe(-50);
        });

        test('calculates standard score for correct answer', () => {
            const score = strategy.calculate({ isCorrect: true, timeTaken: 5000, maxTime });
            expect(score).toBe(550);
        });
    });

    describe('BinaryScoring', () => {
        const strategy = new BinaryScoring(500);

        test('returns fixed points regardless of time', () => {
            expect(strategy.calculate({ isCorrect: true, timeTaken: 100, maxTime: 10000 })).toBe(500);
            expect(strategy.calculate({ isCorrect: true, timeTaken: 9000, maxTime: 10000 })).toBe(500);
        });

        test('returns 0 for wrong answer', () => {
            expect(strategy.calculate({ isCorrect: false, timeTaken: 100, maxTime: 10000 })).toBe(0);
        });
    });

    describe('ScoringFactory', () => {
        test('returns StandardScoring by default', () => {
            const strategy = ScoringFactory.getStrategy({});
            expect(strategy).toBeInstanceOf(StandardScoring);
        });

        test('returns CompetitiveScoring when negative marking enabled', () => {
            const config = { negativeMarking: { enabled: true, penalty: -10 } };
            const strategy = ScoringFactory.getStrategy(config);
            expect(strategy).toBeInstanceOf(CompetitiveScoring);
            expect(strategy.negativeMark).toBe(-10);
        });

        test('returns BinaryScoring when speed bonus disabled', () => {
            const config = { speedBonus: false, basePoints: 200 };
            const strategy = ScoringFactory.getStrategy(config);
            expect(strategy).toBeInstanceOf(BinaryScoring);
            expect(strategy.points).toBe(200);
        });
    });
});
