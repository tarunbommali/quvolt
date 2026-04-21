const express = require('express');
const router = express.Router();
const { protect, requireAdmin } = require('../middleware/auth');
const rbacController = require('../controllers/rbac.controller');

/**
 * RBAC Management Routes
 * Requirements: 7.2, 10.6, 15
 */

// --- Permission Revocation & Real-time Disconnection ---

router.post('/revoke-permission', protect, requireAdmin, rbacController.revokePermission);
router.post('/revoke-role', protect, requireAdmin, rbacController.revokeRoleFromUser);

// --- User Access Data ---

router.get('/user/:userId/connections', protect, requireAdmin, rbacController.getUserConnections);
router.get('/user/:userId/permissions', protect, rbacController.getUserPermissions);

// --- Audit & Security Monitoring ---

router.get('/audit-logs', protect, requireAdmin, rbacController.getAuditLogs);
router.get('/audit-logs/suspicious', protect, requireAdmin, rbacController.getSuspiciousActivity);

// --- Role Management (CRUD) ---

router.get('/roles', protect, requireAdmin, rbacController.listRoles);
router.post('/roles', protect, requireAdmin, rbacController.createRole);
router.put('/roles/:roleId', protect, requireAdmin, rbacController.updateRole);
router.delete('/roles/:roleId', protect, requireAdmin, rbacController.deleteRole);

// --- User-Role Assignments ---

router.post('/users/:userId/roles', protect, requireAdmin, rbacController.assignRoleToUser);
router.delete('/users/:userId/roles/:roleId', protect, requireAdmin, rbacController.revokeRoleFromUser);

module.exports = router;
