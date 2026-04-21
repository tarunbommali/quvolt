const QuizBuilder = require('../modules/quiz/builder/QuizBuilder');

describe('QuizBuilder (Builder Pattern)', () => {
    const hostId = 'HOST123';

    test('creates a valid quiz template with defaults', () => {
        const builder = new QuizBuilder(hostId);
        const quiz = builder.build();

        expect(quiz.hostId).toBe(hostId);
        expect(quiz.name).toBe('New Quiz');
        expect(quiz.timer.questionTime).toBe(15);
        expect(quiz.scoring.basePoints).toBe(100);
        expect(quiz.access.allowLateJoin).toBe(true);
    });

    test('fluent API updates configuration correctly', () => {
        const quiz = new QuizBuilder(hostId)
            .setName('Hardcore JS')
            .setTimer(30, 5, false)
            .setScoring({ basePoints: 200, negativeMarking: true, penalty: -50 })
            .setAccess(100, false)
            .enableAntiCheat(true)
            .build();

        expect(quiz.name).toBe('Hardcore JS');
        expect(quiz.timer).toEqual({
            questionTime: 30,
            interQuestionDelay: 5,
            autoNext: false
        });
        expect(quiz.scoring).toEqual({
            basePoints: 200,
            speedBonus: true,
            speedBonusMax: 50,
            negativeMarking: { enabled: true, penalty: -50 }
        });
        expect(quiz.access).toEqual({
            maxParticipants: 100,
            allowLateJoin: false
        });
        expect(quiz.advanced.antiCheat).toBe(true);
    });

    test('partial scoring updates maintain defaults', () => {
        const quiz = new QuizBuilder(hostId)
            .setScoring({ speedBonus: false })
            .build();

        expect(quiz.scoring.speedBonus).toBe(false);
        expect(quiz.scoring.basePoints).toBe(100); // Default maintained
        expect(quiz.scoring.negativeMarking.enabled).toBe(false); // Default maintained
    });

    test('chaining order does not affect final object structure', () => {
        const quiz1 = new QuizBuilder(hostId).setName('A').setTimer(10).build();
        const quiz2 = new QuizBuilder(hostId).setTimer(10).setName('A').build();

        expect(quiz1).toEqual(quiz2);
    });
});
