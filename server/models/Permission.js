const mongoose = require('mongoose');

/**
 * Permission Model
 * Defines individual permissions that can be assigned to roles
 * Requirements: 7.1
 */
const PermissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    // Permission naming convention: action_resource (e.g., create_quiz, manage_users)
    match: /^[a-z_]+$/,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  resource: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    // Resource type this permission applies to (e.g., quiz, user, payment, session)
  },
  action: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    // Action type (e.g., create, read, update, delete, manage, join, process, view)
  },
}, { timestamps: true });

// Compound index for efficient permission lookups
PermissionSchema.index({ resource: 1, action: 1 });

module.exports = mongoose.model('Permission', PermissionSchema);
