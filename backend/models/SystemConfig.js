const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema({
  maxFailedLoginAttempts: {
    type: Number,
    default: 5,
    min: 1,
    max: 20
  },
  lockoutDurationHours: {
    type: Number,
    default: 2,
    min: 0.5,
    max: 24
  },
  sessionTimeoutMinutes: {
    type: Number,
    default: 60,
    min: 15,
    max: 480
  },
  passwordMinLength: {
    type: Number,
    default: 6,
    min: 4,
    max: 20
  },
  enableAccountLockout: {
    type: Boolean,
    default: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Ensure only one configuration document exists
systemConfigSchema.index({}, { unique: true });

module.exports = mongoose.model('SystemConfig', systemConfigSchema);