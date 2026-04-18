const { checkPermission, checkAnyPermission, checkAllPermissions } = require('../middleware/checkPermission');
const rbacService = require('../services/rbac/rbac.service');

// Mock the RBAC service
jest.mock('../services/rbac/rbac.service');

// Mock the audit log service to prevent DB calls in unit tests
jest.mock('../services/rbac/auditLog.service', () => ({
  logPermissionDenied: jest.fn().mockResolvedValue(undefined),
  logSensitiveOperation: jest.fn().mockResolvedValue(undefined),
}));

describe('RBAC Middleware Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { _id: 'user123', role: 'host' },
      path: '/test',
      method: 'GET',
      requestId: 'test-correlation-id',
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      get: jest.fn().mockReturnValue('test-agent'),
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('checkPermission middleware', () => {
    it('should call next() when user has permission', async () => {
      rbacService.checkPermission.mockResolvedValue(true);

      const middleware = checkPermission('create_quiz');
      await middleware(req, res, next);

      expect(rbacService.checkPermission).toHaveBeenCalledWith('user123', 'create_quiz', null);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 when user lacks permission (Requirement 7.3)', async () => {
      rbacService.checkPermission.mockResolvedValue(false);

      const middleware = checkPermission('create_quiz');
      await middleware(req, res, next);

      expect(rbacService.checkPermission).toHaveBeenCalledWith('user123', 'create_quiz', null);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        data: null,
        message: expect.stringContaining('Forbidden'),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      req.user = null;

      const middleware = checkPermission('create_quiz');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        data: null,
        message: expect.stringContaining('Not authorized'),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      rbacService.checkPermission.mockRejectedValue(new Error('Database error'));

      const middleware = checkPermission('create_quiz');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        data: null,
        message: expect.stringContaining('Internal server error'),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass resourceId when getResourceId function provided', async () => {
      rbacService.checkPermission.mockResolvedValue(true);
      req.params = { quizId: 'quiz123' };

      const middleware = checkPermission('manage_quiz', {
        getResourceId: (req) => req.params.quizId,
      });
      await middleware(req, res, next);

      expect(rbacService.checkPermission).toHaveBeenCalledWith('user123', 'manage_quiz', 'quiz123');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('checkAnyPermission middleware', () => {
    it('should call next() when user has any of the permissions', async () => {
      rbacService.checkAnyPermission.mockResolvedValue(true);

      const middleware = checkAnyPermission(['create_quiz', 'manage_quiz']);
      await middleware(req, res, next);

      expect(rbacService.checkAnyPermission).toHaveBeenCalledWith(
        'user123',
        ['create_quiz', 'manage_quiz'],
        null
      );
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 when user lacks all permissions', async () => {
      rbacService.checkAnyPermission.mockResolvedValue(false);

      const middleware = checkAnyPermission(['create_quiz', 'manage_quiz']);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('checkAllPermissions middleware', () => {
    it('should call next() when user has all permissions', async () => {
      rbacService.checkAllPermissions.mockResolvedValue(true);

      const middleware = checkAllPermissions(['create_quiz', 'manage_quiz']);
      await middleware(req, res, next);

      expect(rbacService.checkAllPermissions).toHaveBeenCalledWith(
        'user123',
        ['create_quiz', 'manage_quiz'],
        null
      );
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 when user lacks any permission', async () => {
      rbacService.checkAllPermissions.mockResolvedValue(false);

      const middleware = checkAllPermissions(['create_quiz', 'manage_quiz']);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
