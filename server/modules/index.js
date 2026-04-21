const eventBus = require('./core/EventBus');
const socketManager = require('./realtime/SocketManager');
const SessionManager = require('./quiz/SessionManager');
const QuestionManager = require('./quiz/QuestionManager');
const questionEngine = require('./quiz/QuestionEngine');
const QuizBuilder = require('./quiz/builder/QuizBuilder');

/**
 * Server Module Registry
 */
module.exports = {
    eventBus,
    socketManager,
    SessionManager,
    QuestionManager,
    questionEngine,
    QuizBuilder
};
