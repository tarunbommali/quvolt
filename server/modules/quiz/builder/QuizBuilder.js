/**
 * QuizBuilder (Builder Pattern)
 * Provides a fluent interface for creating complex QuizTemplate objects.
 */
class QuizBuilder {
    constructor(hostId) {
        this.config = {
            hostId,
            name: 'New Quiz',
            timer: { questionTime: 15, autoNext: true, interQuestionDelay: 3 },
            scoring: { basePoints: 100, speedBonus: true, speedBonusMax: 50, negativeMarking: { enabled: false, penalty: 25 } },
            leaderboard: { enabled: true, showLive: true, showAfterEachQuestion: true },
            flow: { shuffleQuestions: false, shuffleOptions: false },
            access: { allowLateJoin: true, maxParticipants: 50 },
            advanced: { antiCheat: false }
        };
    }

    setName(name) {
        this.config.name = name;
        return this;
    }

    setTimer(questionTime, interQuestionDelay = 3, autoNext = true) {
        this.config.timer = { questionTime, interQuestionDelay, autoNext };
        return this;
    }

    setScoring({ basePoints = 100, speedBonus = true, negativeMarking = false, penalty = 25 }) {
        this.config.scoring = {
            basePoints,
            speedBonus,
            speedBonusMax: speedBonus ? 50 : 0,
            negativeMarking: { enabled: negativeMarking, penalty }
        };
        return this;
    }

    setAccess(maxParticipants, allowLateJoin = true) {
        this.config.access = { maxParticipants, allowLateJoin };
        return this;
    }

    enableAntiCheat(enabled = true) {
        this.config.advanced.antiCheat = enabled;
        return this;
    }

    /**
     * @returns {Object} Final template configuration
     */
    build() {
        return this.config;
    }
}

module.exports = QuizBuilder;
