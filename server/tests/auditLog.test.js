/**
 * Comprehensive tests for Audit Logging
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const AuditLog = require('../models/AuditLog');
const auditLogService = require('../services/rbac/auditLog.service');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await AuditLog.deleteMany({});
});

// ─── Permission Failure Logging ───────────────────────────────────────────────

describe('Audit Logging - Permission Failures (Requirement 9.1)', () => {
  test('should create audit log on permission denial', async () => {
    await auditLogService.logPermissionDenied({
      userId: new mongoose.Types.ObjectId(),
      resourceType: 'quiz',
      resourceId: 'quiz123',
      action: 'DELETE /api/quiz/quiz123',
      permission: 'delete_quiz',
      reason: 'Permission denied',
      correlationId: 'corr-001',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    });

    const logs = await AuditLog.find({});
    expect(logs).toHaveLength(1);
    expect(logs[0].result).toBe('denied');
    expect(logs[0].permission).toBe('delete_quiz');
  });

  test('should include all required fields in permission denial log', async () => {
    const userId = new mongoose.Types.ObjectId();
    const correlationId = 'corr-test-001';

    await auditLogService.logPermissionDenied({
      userId,
      resourceType: 'quiz',
      resourceId: 'quiz123',
      action: 'POST /api/quiz',
      permission: 'create_quiz',
      reason: 'Permission denied',
      correlationId,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    });

    const log = await AuditLog.findOne({ correlationId });
    expect(log).toBeTruthy();
    expect(log.userId.toString()).toBe(userId.toString());
    expect(log.resourceType).toBe('quiz');
    expect(log.resourceId).toBe('quiz123');
    expect(log.action).toBe('POST /api/quiz');
    expect(log.result).toBe('denied');
    expect(log.correlationId).toBe(correlationId); // Requirement 9.3
  });

  test('should include correlation ID for request tracing (Requirement 9.3)', async () => {
    const correlationId = 'trace-abc-123';

    await auditLogService.logPermissionDenied({
      userId: new mongoose.Types.ObjectId(),
      resourceType: 'payment',
      resourceId: 'pay123',
      action: 'POST /payment/create-order',
      permission: 'process_payment',
      reason: 'Permission denied',
      correlationId,
    });

    const log = await AuditLog.findOne({ correlationId });
    expect(log).toBeTruthy();
    expect(log.correlationId).toBe(correlationId);
  });
});

// ─── Sensitive Operation Logging ─────────────────────────────────────────────

describe('Audit Logging - Sensitive Operations (Requirement 9.2)', () => {
  test('should log delete operations as sensitive', async () => {
    await auditLogService.logSensitiveOperation({
      userId: new mongoose.Types.ObjectId(),
      resourceType: 'quiz',
      resourceId: 'quiz123',
      action: 'delete_quiz',
      permission: 'delete_quiz',
      correlationId: 'corr-del-001',
    });

    const log = await AuditLog.findOne({ action: 'delete_quiz' });
    expect(log).toBeTruthy();
    expect(log.isSensitiveOperation).toBe(true);
    expect(log.result).toBe('success');
  });

  test('should log role changes as sensitive', async () => {
    await auditLogService.logSensitiveOperation({
      userId: new mongoose.Types.ObjectId(),
      resourceType: 'role',
      resourceId: 'role123',
      action: 'assign_role',
      permission: 'manage_roles',
      correlationId: 'corr-role-001',
    });

    const log = await AuditLog.findOne({ action: 'assign_role' });
    expect(log).toBeTruthy();
    expect(log.isSensitiveOperation).toBe(true);
  });

  test('should log payment configuration changes as sensitive', async () => {
    await auditLogService.logSensitiveOperation({
      userId: new mongoose.Types.ObjectId(),
      resourceType: 'gateway',
      resourceId: 'razorpay',
      action: 'update_gateway_config',
      permission: 'manage_gateway_config',
      correlationId: 'corr-gw-001',
      metadata: { gatewayName: 'razorpay', configKeys: ['enabled', 'priority'] },
    });

    const log = await AuditLog.findOne({ action: 'update_gateway_config' });
    expect(log).toBeTruthy();
    expect(log.isSensitiveOperation).toBe(true);
    expect(log.metadata.gatewayName).toBe('razorpay');
  });
});

// ─── Audit Log Query ──────────────────────────────────────────────────────────

describe('Audit Log Query (Requirements 9.4, 9.7)', () => {
  beforeEach(async () => {
    const userId1 = new mongoose.Types.ObjectId();
    const userId2 = new mongoose.Types.ObjectId();

    // Create test logs
    await AuditLog.create([
      {
        userId: userId1,
        resourceType: 'quiz',
        resourceId: 'quiz1',
        action: 'create_quiz',
        result: 'success',
        correlationId: 'c1',
        createdAt: new Date('2026-01-01'),
      },
      {
        userId: userId1,
        resourceType: 'quiz',
        resourceId: 'quiz2',
        action: 'delete_quiz',
        result: 'denied',
        correlationId: 'c2',
        createdAt: new Date('2026-01-02'),
      },
      {
        userId: userId2,
        resourceType: 'payment',
        resourceId: 'pay1',
        action: 'create_order',
        result: 'success',
        correlationId: 'c3',
        createdAt: new Date('2026-01-03'),
      },
    ]);

    this.userId1 = userId1;
    this.userId2 = userId2;
  });

  test('should filter logs by userId', async () => {
    const userId = (await AuditLog.findOne({ correlationId: 'c1' })).userId;
    const result = await auditLogService.queryLogs({ userId: userId.toString() });

    expect(result.logs.length).toBeGreaterThanOrEqual(1);
    result.logs.forEach(log => {
      expect(log.userId.toString()).toBe(userId.toString());
    });
  });

  test('should filter logs by resourceType', async () => {
    const result = await auditLogService.queryLogs({ resourceType: 'payment' });

    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].resourceType).toBe('payment');
  });

  test('should filter logs by result', async () => {
    const result = await auditLogService.queryLogs({ result: 'denied' });

    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].result).toBe('denied');
  });

  test('should filter logs by time range', async () => {
    const result = await auditLogService.queryLogs({
      startDate: '2026-01-01',
      endDate: '2026-01-02',
    });

    expect(result.logs.length).toBeGreaterThanOrEqual(1);
    expect(result.logs.length).toBeLessThanOrEqual(2);
  });

  test('should paginate results', async () => {
    const result = await auditLogService.queryLogs({ page: 1, limit: 2 });

    expect(result.logs.length).toBeLessThanOrEqual(2);
    expect(result.page).toBe(1);
    expect(result.total).toBeGreaterThanOrEqual(3);
    expect(result.pages).toBeGreaterThanOrEqual(2);
  });

  test('should return empty results for non-matching filters', async () => {
    const result = await auditLogService.queryLogs({ resourceType: 'nonexistent' });

    expect(result.logs).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

// ─── Retention Policy ─────────────────────────────────────────────────────────

describe('Audit Log Retention Policy (Requirement 9.5)', () => {
  test('AuditLog model should have TTL index for 90-day retention', async () => {
    // Verify the TTL is defined in the schema (7776000 seconds = 90 days)
    const schema = AuditLog.schema;
    const indexes = schema.indexes();
    
    const ttlIndex = indexes.find(([fields, opts]) => 
      opts && opts.expireAfterSeconds === 7776000
    );

    expect(ttlIndex).toBeTruthy();
  });

  test('should be able to query logs within retention period', async () => {
    const recentLog = await AuditLog.create({
      userId: new mongoose.Types.ObjectId(),
      resourceType: 'quiz',
      action: 'test_action',
      result: 'success',
      correlationId: 'recent-001',
    });

    const found = await AuditLog.findById(recentLog._id);
    expect(found).toBeTruthy();
  });
});

// ─── Suspicious Activity Detection ───────────────────────────────────────────

describe('Suspicious Activity Detection (Requirement 9.6)', () => {
  test('should flag user after 5+ permission failures in 10 minutes', async () => {
    const userId = new mongoose.Types.ObjectId();

    // Create 6 permission failures
    for (let i = 0; i < 6; i++) {
      await auditLogService.logPermissionDenied({
        userId,
        resourceType: 'quiz',
        resourceId: `quiz${i}`,
        action: `GET /api/quiz/quiz${i}`,
        permission: 'view_quiz',
        reason: 'Permission denied',
        correlationId: `corr-sus-${i}`,
      });
    }

    // Check that logs are flagged as suspicious
    const suspiciousLogs = await AuditLog.find({ userId, isSuspicious: true });
    expect(suspiciousLogs.length).toBeGreaterThan(0);
  });

  test('should NOT flag user with fewer than 5 failures', async () => {
    const userId = new mongoose.Types.ObjectId();

    // Create only 3 permission failures
    for (let i = 0; i < 3; i++) {
      await auditLogService.logPermissionDenied({
        userId,
        resourceType: 'quiz',
        resourceId: `quiz${i}`,
        action: `GET /api/quiz/quiz${i}`,
        permission: 'view_quiz',
        reason: 'Permission denied',
        correlationId: `corr-ok-${i}`,
      });
    }

    const suspiciousLogs = await AuditLog.find({ userId, isSuspicious: true });
    expect(suspiciousLogs).toHaveLength(0);
  });

  test('getSuspiciousActivity should return summary of flagged users', async () => {
    const userId = new mongoose.Types.ObjectId();

    // Create suspicious activity
    await AuditLog.create({
      userId,
      resourceType: 'quiz',
      action: 'test',
      result: 'denied',
      correlationId: 'sus-001',
      isSuspicious: true,
    });

    const activity = await auditLogService.getSuspiciousActivity();
    expect(activity.length).toBeGreaterThan(0);
    expect(activity[0].failureCount).toBeGreaterThan(0);
  });
});
