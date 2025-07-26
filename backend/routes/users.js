const express = require('express');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { logAuditEvent } = require('../utils/auditLogger');
const router = express.Router();

// Get all users (Admin only)
router.get('/', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create user (Admin only)
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const user = new User({
      name,
      email,
      password,
      role: role || 'user',
      department
    });
    
    await user.save();
    
    const userResponse = await User.findById(user._id).select('-password');
    res.status(201).json(userResponse);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user status (Admin only)
router.patch('/:id', adminAuth, async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user profile (Admin only)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { name, email, role, department } = req.body;
    const userId = req.params.id;
    
    // Check if email is already taken by another user
    const existingUser = await User.findOne({ email, _id: { $ne: userId } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { name, email, role, department },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Log audit event
    await logAuditEvent({
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'User',
      resourceId: userId,
      details: `Updated user profile: ${user.name} (${user.email})`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Change user password (Admin only)
router.patch('/:id/password', adminAuth, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.params.id;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update the password
    await User.findByIdAndUpdate(userId, { password: hashedPassword });
    
    // Log audit event
    await logAuditEvent({
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'User',
      resourceId: userId,
      details: `Changed password for user: ${user.name} (${user.email})`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;