const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateScore } = require('../utils/scoring');

test('calculateScore returns 0 for incorrect answers', () => {
    assert.equal(calculateScore(false, 0, 30), 0);
    assert.equal(calculateScore(false, 10, 30), 0);
});

test('calculateScore returns max score for correct and instant answer', () => {
    assert.equal(calculateScore(true, 0, 30), 1000);
});

test('calculateScore clamps to minimum 100 at max time', () => {
    assert.equal(calculateScore(true, 30, 30), 100);
    assert.equal(calculateScore(true, 40, 30), 100);
});

test('calculateScore is monotonic by response time', () => {
    const fast = calculateScore(true, 2, 20);
    const medium = calculateScore(true, 10, 20);
    const slow = calculateScore(true, 18, 20);

    assert.ok(fast > medium);
    assert.ok(medium > slow);
});
