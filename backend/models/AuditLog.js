const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Some actions might be system-generated
  },
  action: {
    type: String,
    required: true,
    enum: ['create', 'update', 'delete', 'login', 'logout', 'view', 'export', 'password_change', 'profile_update']
  },
  resource: {
    type: String,
    required: true // e.g., 'ticket', 'user', 'knowledge-base', 'user_password', 'user_profile'
  },
  resourceId: {
    type: String,
    required: false // ID of the affected resource
  },
  details: {
    type: String,
    required: false // Additional details about the action
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ user: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ resource: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);