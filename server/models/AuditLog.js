const mongoose = require('mongoose');

/**
 * Audit Log Model
 * Tracks permission checks and access attempts for security auditing
 * Requirements: 9.1, 9.2, 9.3
 */
const AuditLogSchema = new mongoose.Schema({
  // User who performed the action
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Resource being accessed
  resourceType: {
    type: String,
    required: true,
    enum: ['quiz', 'session', 'payment', 'user', 'role', 'permission', 'gateway', 'other'],
    index: true,
  },
  
  resourceId: {
    type: String,
    index: true,
  },
  
  // Action attempted
  action: {
    type: String,
    required: true,
    index: true,
  },
  
  // Result of the action
  result: {
    type: String,
    required: true,
    enum: ['success', 'denied', 'error'],
    index: true,
  },
  
  // Permission that was checked (if applicable)
  permission: {
    type: String,
    index: true,
  },
  
  // Reason for denial or error message
  reason: {
    type: String,
  },
  
  // Request correlation ID for tracing (Requirement 9.3)
  correlationId: {
    type: String,
  },
  
  // IP address and user agent
  ipAddress: {
    type: String,
  },
  
  userAgent: {
    type: String,
  },
  
  // Flags for special cases
  isSensitiveOperation: {
    type: Boolean,
    default: false,
    index: true,
  },
  
  isSuspicious: {
    type: Boolean,
    default: false,
    index: true,
  },
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
  
  // Timestamp (auto-managed by timestamps option)
}, {
  timestamps: true,
});

// Indexes for efficient querying
AuditLogSchema.index({ createdAt: -1 }); // Time-based queries
AuditLogSchema.index({ userId: 1, createdAt: -1 }); // User activity history
AuditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 }); // Resource access history
AuditLogSchema.index({ result: 1, createdAt: -1 }); // Failed access attempts
AuditLogSchema.index({ isSuspicious: 1, createdAt: -1 }); // Suspicious activity
AuditLogSchema.index({ correlationId: 1 }); // Request tracing

// TTL index for automatic cleanup after 90 days (Requirement 9.5)
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

module.exports = mongoose.model('AuditLog', AuditLogSchema);
