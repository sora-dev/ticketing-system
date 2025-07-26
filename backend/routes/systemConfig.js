const express = require('express');
const SystemConfig = require('../models/SystemConfig');
const { auth, adminAuth } = require('../middleware/auth');
const { logAuditEvent } = require('../utils/auditLogger');
const router = express.Router();

// Get system configuration (Admin only)
router.get('/', auth, adminAuth, async (req, res) => {
  try {
    let config = await SystemConfig.findOne().populate('updatedBy', 'name');
    
    // Create default config if none exists
    if (!config) {
      config = new SystemConfig({
        updatedBy: req.user._id
      });
      await config.save();
      await config.populate('updatedBy', 'name');
    }
    
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update system configuration (Admin only)
router.put('/', auth, adminAuth, async (req, res) => {
  try {
    const {
      maxFailedLoginAttempts,
      lockoutDurationHours,
      sessionTimeoutMinutes,
      passwordMinLength,
      enableAccountLockout
    } = req.body;
    
    let config = await SystemConfig.findOne();
    
    if (!config) {
      config = new SystemConfig({
        maxFailedLoginAttempts,
        lockoutDurationHours,
        sessionTimeoutMinutes,
        passwordMinLength,
        enableAccountLockout,
        updatedBy: req.user._id
      });
    } else {
      config.maxFailedLoginAttempts = maxFailedLoginAttempts;
      config.lockoutDurationHours = lockoutDurationHours;
      config.sessionTimeoutMinutes = sessionTimeoutMinutes;
      config.passwordMinLength = passwordMinLength;
      config.enableAccountLockout = enableAccountLockout;
      config.updatedBy = req.user._id;
    }
    
    await config.save();
    await config.populate('updatedBy', 'name');
    
    // Log audit event
    await logAuditEvent({
      userId: req.user._id,
      action: 'update',
      resource: 'SystemConfig',
      details: `Updated system configuration: Max login attempts: ${maxFailedLoginAttempts}, Lockout duration: ${lockoutDurationHours}h`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reset all user lockouts (Admin only)
router.post('/reset-lockouts', auth, adminAuth, async (req, res) => {
  try {
    const User = require('../models/User');
    
    const result = await User.updateMany(
      { lockoutUntil: { $exists: true } },
      { 
        $unset: { 
          lockoutUntil: 1, 
          failedLoginAttempts: 1, 
          lastFailedLogin: 1 
        } 
      }
    );
    
    // Log audit event
    await logAuditEvent({
      userId: req.user._id,
      action: 'update',
      resource: 'User',
      details: `Reset lockouts for ${result.modifiedCount} users`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({ 
      message: `Successfully reset lockouts for ${result.modifiedCount} users`,
      count: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;