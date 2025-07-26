const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'support', 'admin'],
    default: 'user',
  },
  department: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Failed login tracking
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  lockoutUntil: {
    type: Date,
    default: null,
  },
  lastFailedLogin: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockoutUntil && this.lockoutUntil > Date.now());
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Method to increment failed login attempts
userSchema.methods.incLoginAttempts = async function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockoutUntil && this.lockoutUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockoutUntil: 1 },
      $set: { failedLoginAttempts: 1, lastFailedLogin: Date.now() }
    });
  }
  
  const updates = {
    $inc: { failedLoginAttempts: 1 },
    $set: { lastFailedLogin: Date.now() }
  };
  
  // Get system configuration for max attempts
  const SystemConfig = require('./SystemConfig');
  const config = await SystemConfig.findOne() || { maxFailedLoginAttempts: 5 };
  
  // If we have reached max attempts and it's not locked yet, lock it
  if (this.failedLoginAttempts + 1 >= config.maxFailedLoginAttempts && !this.isLocked) {
    updates.$set.lockoutUntil = Date.now() + (2 * 60 * 60 * 1000); // 2 hours lockout
  }
  
  return this.updateOne(updates);
};

// Method to reset failed login attempts
userSchema.methods.resetLoginAttempts = async function() {
  return this.updateOne({
    $unset: { failedLoginAttempts: 1, lockoutUntil: 1, lastFailedLogin: 1 }
  });
};

module.exports = mongoose.model('User', userSchema);