const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildPrompt,
    calculateDifficultyCounts,
    extractJSONArray,
    normalizeQuestions,
    validateGenerateInput,
} = require('../services/ai.service');

test('buildPrompt embeds topic difficulty and count with strict JSON instruction', () => {
    const prompt = buildPrompt({ topic: 'JavaScript closures', difficulty: 'medium', count: 5 });
    assert.match(prompt, /Generate 5 multiple-choice questions/i);
    assert.match(prompt, /JavaScript closures/);
    assert.match(prompt, /medium difficulty/i);
    assert.match(prompt, /Return ONLY valid JSON/i);
});

test('extractJSONArray parses direct JSON array', () => {
    const parsed = extractJSONArray('[{"text":"Q1"}]');
    assert.ok(Array.isArray(parsed));
    assert.equal(parsed.length, 1);
});

test('extractJSONArray parses JSON array embedded in text', () => {
    const parsed = extractJSONArray('Here you go: [{"text":"Q1"}] End');
    assert.ok(Array.isArray(parsed));
    assert.equal(parsed[0].text, 'Q1');
});

test('normalizeQuestions validates strict option/correct answer shape', () => {
    const items = normalizeQuestions([
        {
            text: 'What is closure?',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'B',
            explanation: 'Because lexical scope',
        },
    ]);

    assert.equal(items.length, 1);
    assert.equal(items[0].correctOption, 1);
    assert.equal(items[0].timeLimit, 15);
    assert.equal(items[0].shuffleOptions, true);
});

test('normalizeQuestions rejects malformed options', () => {
    assert.throws(() => normalizeQuestions([
        { text: 'Bad', options: ['A', 'B'], correctAnswer: 'A' },
    ]));
});

test('validateGenerateInput enforces limits and difficulty', () => {
    const normalized = validateGenerateInput({ topic: 'Node.js', difficulty: 'hard', count: 10 });
    assert.equal(normalized.count, 10);
    assert.equal(normalized.difficulty, 'hard');
    assert.deepEqual(normalized.distribution, { easy: 0, medium: 0, hard: 100 });

    const mixed = validateGenerateInput({
        topic: 'Node.js',
        count: 10,
        distribution: { easy: 50, medium: 30, hard: 20 },
    });
    assert.deepEqual(mixed.distribution, { easy: 50, medium: 30, hard: 20 });

    assert.throws(() => validateGenerateInput({ topic: '', difficulty: 'hard', count: 5 }));
    assert.throws(() => validateGenerateInput({ topic: 'X', difficulty: 'expert', count: 5 }));
    assert.throws(() => validateGenerateInput({ topic: 'X', difficulty: 'easy', count: 100 }));
    assert.throws(() => validateGenerateInput({ topic: 'X', count: 10, distribution: { easy: 40, medium: 40, hard: 10 } }));
});

test('calculateDifficultyCounts allocates exact total count', () => {
    const counts = calculateDifficultyCounts(10, { easy: 50, medium: 30, hard: 20 });
    assert.equal(counts.easy + counts.medium + counts.hard, 10);
    assert.equal(counts.easy, 5);
    assert.equal(counts.medium, 3);
    assert.equal(counts.hard, 2);

    const rounded = calculateDifficultyCounts(7, { easy: 34, medium: 33, hard: 33 });
    assert.equal(rounded.easy + rounded.medium + rounded.hard, 7);
});
