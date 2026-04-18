const mongoose = require('mongoose');

/**
 * Role Model
 * Defines roles with associated permissions and hierarchical relationships
 * Requirements: 7.1, 7.4
 */
const RoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    enum: ['admin', 'host', 'participant'],
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300,
  },
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission',
  }],
  // Hierarchical role support - admin inherits all permissions
  isAdmin: {
    type: Boolean,
    default: false,
  },
  // Priority for role evaluation (higher = more privileged)
  priority: {
    type: Number,
    required: true,
    default: 0,
  },
}, { timestamps: true });

// Indexes for efficient role lookups
RoleSchema.index({ priority: -1 });

/**
 * Check if this role has a specific permission
 * Admin role automatically has all permissions (Requirement 7.4)
 */
RoleSchema.methods.hasPermission = function(permissionId) {
  if (this.isAdmin) return true;
  return this.permissions.some(p => p.toString() === permissionId.toString());
};

module.exports = mongoose.model('Role', RoleSchema);
