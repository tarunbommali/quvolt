// RBAC middleware: requireRole
//
// Design: this middleware is intentionally a thin RBAC wrapper.
// It works in two modes:
//
//  1. Chained after protect()  — req.user is already populated, no DB/JWT work done.
//  2. Standalone (legacy)      — decodes the Bearer token itself and normalises
//                                req.user to the same {_id, id, role} shape that
//                                protect() produces, so downstream code sees a
//                                consistent object regardless of which middleware ran.
//
// Usage: requireRole(['host', 'admin'])

const { protect, authorize } = require('./auth');

function requireRole(allowedRoles = []) {
    return [protect, authorize(...allowedRoles)];
}

module.exports = requireRole;

