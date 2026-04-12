const test = require('node:test');
const assert = require('node:assert/strict');
const { hashAnswer, compareAnswers } = require('../utils/crypto');

test('hashAnswer returns a 64-char hex string', () => {
    const hash = hashAnswer('OptionA');
    assert.equal(typeof hash, 'string');
    assert.equal(hash.length, 64);
    assert.match(hash, /^[0-9a-f]{64}$/);
});

test('hashAnswer is deterministic for the same input', () => {
    assert.equal(hashAnswer('hello'), hashAnswer('hello'));
});

test('hashAnswer normalises whitespace and case', () => {
    assert.equal(hashAnswer('  Hello  '), hashAnswer('hello'));
    assert.equal(hashAnswer('WORLD'), hashAnswer('world'));
    assert.equal(hashAnswer('  Option A  '), hashAnswer('option a'));
});

test('hashAnswer treats null and undefined as empty string', () => {
    assert.equal(hashAnswer(null), hashAnswer(''));
    assert.equal(hashAnswer(undefined), hashAnswer(''));
});

test('hashAnswer produces different hashes for different inputs', () => {
    assert.notEqual(hashAnswer('A'), hashAnswer('B'));
    assert.notEqual(hashAnswer('Option A'), hashAnswer('Option B'));
});

test('compareAnswers returns true for matching answer', () => {
    const stored = hashAnswer('Paris');
    assert.equal(compareAnswers('Paris', stored), true);
});

test('compareAnswers is case-insensitive', () => {
    const stored = hashAnswer('paris');
    assert.equal(compareAnswers('PARIS', stored), true);
    assert.equal(compareAnswers('Paris', stored), true);
});

test('compareAnswers is whitespace-insensitive', () => {
    const stored = hashAnswer('Paris');
    assert.equal(compareAnswers('  Paris  ', stored), true);
});

test('compareAnswers returns false for wrong answer', () => {
    const stored = hashAnswer('Paris');
    assert.equal(compareAnswers('London', stored), false);
    assert.equal(compareAnswers('', stored), false);
});
