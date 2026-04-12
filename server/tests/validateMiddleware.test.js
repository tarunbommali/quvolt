const test = require('node:test');
const assert = require('node:assert/strict');
const { check } = require('express-validator');
const validate = require('../middleware/validate');

// Runs a set of express-validator chains against a synthetic request, then
// invokes the validate middleware so tests can inspect the outcome without
// needing a full HTTP server.
const runChain = async (validators, body = {}) => {
    const req = { body, headers: {}, params: {}, query: {} };
    await Promise.all(validators.map((v) => v.run(req)));
    return req;
};

const makeFakeRes = () => {
    const res = {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; },
    };
    return res;
};

test('validate calls next() when there are no validation errors', async () => {
    const validators = [check('name').notEmpty().withMessage('Name is required')];
    const req = await runChain(validators, { name: 'Alice' });
    const res = makeFakeRes();

    let nextCalled = false;
    validate(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.equal(res.body, null);
    assert.equal(res.statusCode, 200);
});

test('validate returns 400 and does not call next() when errors exist', async () => {
    const validators = [check('email').isEmail().withMessage('Invalid email')];
    const req = await runChain(validators, { email: 'not-an-email' });
    const res = makeFakeRes();

    let nextCalled = false;
    validate(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 400);
    assert.ok(res.body);
    assert.equal(res.body.message, 'Validation failed');
    assert.ok(Array.isArray(res.body.errors));
    assert.equal(res.body.errors.length, 1);
    assert.equal(res.body.errors[0].field, 'email');
    assert.equal(typeof res.body.errors[0].message, 'string');
});

test('validate reports multiple field errors', async () => {
    const validators = [
        check('username').notEmpty().withMessage('Username required'),
        check('age').isInt({ min: 18 }).withMessage('Must be 18 or older'),
    ];
    const req = await runChain(validators, { username: '', age: 10 });
    const res = makeFakeRes();

    let nextCalled = false;
    validate(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 400);
    assert.ok(Array.isArray(res.body.errors));
    assert.equal(res.body.errors.length, 2);
});

test('validate passes with no validators attached to request', async () => {
    const req = { body: {}, headers: {}, params: {}, query: {} };
    const res = makeFakeRes();

    let nextCalled = false;
    validate(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
});
