const test = require('node:test');
const assert = require('node:assert/strict');
const { generateCode } = require('../utils/codeGenerator');

test('generateCode returns a 6-char uppercase alphanumeric code', () => {
    const code = generateCode();
    assert.equal(code.length, 6);
    assert.match(code, /^[A-Z0-9]{6}$/);
});

test('generateCode is stable format across multiple calls', () => {
    const codes = Array.from({ length: 50 }, () => generateCode());
    for (const code of codes) {
        assert.equal(code.length, 6);
        assert.match(code, /^[A-Z0-9]{6}$/);
    }
});
