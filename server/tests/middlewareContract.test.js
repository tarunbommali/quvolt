if (typeof jest !== 'undefined') {
    const jwt = require('jsonwebtoken');
    const { protect, authorize } = require('../middleware/auth');

    describe('Middleware Contract Tests (authMiddleware + roleMiddleware)', () => {
        beforeAll(() => {
            process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
        });

        const runProtect = (authorizationHeader) => {
            const req = { headers: {} };
            if (authorizationHeader) req.headers.authorization = authorizationHeader;

            const res = {
                statusCode: 200,
                body: null,
                status(code) {
                    this.statusCode = code;
                    return this;
                },
                json(payload) {
                    this.body = payload;
                    return this;
                },
            };

            const next = jest.fn();
            protect(req, res, next);
            return { req, res, next };
        };

        test('authMiddleware denies missing token with contract', () => {
            const { res, next } = runProtect();
            expect(next).not.toHaveBeenCalled();
            expect(res.statusCode).toBe(401);
            expect(res.body).toEqual(expect.objectContaining({ success: false, data: null }));
            expect(typeof res.body.message).toBe('string');
        });

        test('authMiddleware denies malformed token with contract', () => {
            const { res, next } = runProtect('Bearer malformed.token');
            expect(next).not.toHaveBeenCalled();
            expect(res.statusCode).toBe(401);
            expect(res.body).toEqual(expect.objectContaining({ success: false, data: null }));
            expect(typeof res.body.message).toBe('string');
        });

        test('authMiddleware accepts valid token and sets req.user', () => {
            const token = jwt.sign({ id: '507f1f77bcf86cd799439011', role: 'host' }, process.env.JWT_SECRET, { expiresIn: '1h' });
            const { req, res, next } = runProtect(`Bearer ${token}`);
            expect(next).toHaveBeenCalledTimes(1);
            expect(res.body).toBeNull();
            expect(req.user).toEqual(expect.objectContaining({ role: 'host' }));
        });

        test('roleMiddleware denies forbidden role with contract', () => {
            const req = { user: { _id: 'u1', role: 'participant' } };
            const res = {
                statusCode: 200,
                body: null,
                status(code) {
                    this.statusCode = code;
                    return this;
                },
                json(payload) {
                    this.body = payload;
                    return this;
                },
            };
            const next = jest.fn();

            authorize('host', 'admin')(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.statusCode).toBe(403);
            expect(res.body).toEqual(expect.objectContaining({ success: false, data: null }));
            expect(typeof res.body.message).toBe('string');
        });

        test('roleMiddleware allows host role', () => {
            const req = { user: { _id: 'u1', role: 'host' } };
            const res = { status: () => res, json: () => res };
            const next = jest.fn();

            authorize('host', 'admin')(req, res, next);
            expect(next).toHaveBeenCalledTimes(1);
        });
    });
}
