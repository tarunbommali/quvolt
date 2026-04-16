const test = require('node:test');
const assert = require('node:assert');
const { protect, authorize } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// Mock req, res, next
const mockRes = () => {
    const res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.body = data; return res; };
    return res;
};

const mockNext = () => {
    let called = false;
    const nextFn = () => { called = true; };
    nextFn.wasCalled = () => called;
    return nextFn;
};

// Assuming process.env.JWT_SECRET is set for tests
process.env.JWT_SECRET = 'test_secret';
const jwt = require('jsonwebtoken');

const createToken = (id, role) => jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
const createExpiredToken = (id, role) => jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '-1h' });

test('RBAC Middleware Tests', async (t) => {
    
    await t.test('protect() -> passes valid token', (t) => {
        const token = createToken('user123', 'participant');
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = mockRes();
        const next = mockNext();

        protect(req, res, next);
        assert.strictEqual(next.wasCalled(), true);
        assert.strictEqual(req.user.id, 'user123');
        assert.strictEqual(req.user.role, 'participant');
    });

    await t.test('protect() -> rejects no token', (t) => {
        const req = { headers: {} };
        const res = mockRes();
        const next = mockNext();

        protect(req, res, next);
        assert.strictEqual(next.wasCalled(), false);
        assert.strictEqual(res.statusCode, 401);
    });

    await t.test('protect() -> rejects expired token', (t) => {
        const token = createExpiredToken('user123', 'participant');
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = mockRes();
        const next = mockNext();

        protect(req, res, next);
        assert.strictEqual(next.wasCalled(), false);
        assert.strictEqual(res.statusCode, 401);
        assert.strictEqual(res.body.message, 'Not authorized, token expired');
    });

    await t.test('authorize() -> passes correct roles', (t) => {
        const req = { user: { role: 'admin' } };
        const res = mockRes();
        const next = mockNext();
        
        const authMw = authorize('admin', 'organizer');
        authMw(req, res, next);

        assert.strictEqual(next.wasCalled(), true);
    });

    await t.test('authorize() -> rejects incorrect roles', (t) => {
        const req = { user: { role: 'participant' } };
        const res = mockRes();
        const next = mockNext();
        
        const authMw = authorize('admin', 'organizer');
        authMw(req, res, next);

        assert.strictEqual(next.wasCalled(), false);
        assert.strictEqual(res.statusCode, 403);
    });

    await t.test('requireRole() [Consolidated] -> returns [protect, authorize]', (t) => {
        const middlewareArray = requireRole(['organizer']);
        assert.strictEqual(Array.isArray(middlewareArray), true);
        assert.strictEqual(middlewareArray.length, 2);
    });
});
