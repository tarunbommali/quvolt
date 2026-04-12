const crypto = require('crypto');

const hashAnswer = (answer) => {
    const safeValue = (answer || '').toString().trim().toLowerCase();
    return crypto.createHash('sha256').update(safeValue).digest('hex');
};

const compareAnswers = (submittedAnswer, hashedCorrectAnswer) => {
    const hashedSubmitted = hashAnswer(submittedAnswer);
    return hashedSubmitted === hashedCorrectAnswer;
};

module.exports = { hashAnswer, compareAnswers };
