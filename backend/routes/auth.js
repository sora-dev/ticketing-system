const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth'); // Add this import
const router = express.Router();
const { logAuditEvent } = require('../utils/auditLogger');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: role || 'user'
    });
    
    await user.save();
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login
// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check if user account is active
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account has been deactivated. Please contact administrator.' });
    }
    
    // Check if account is locked
    if (user.isLocked) {
      const lockoutTime = new Date(user.lockoutUntil).toLocaleString();
      return res.status(423).json({ 
        message: `Account is temporarily locked due to multiple failed login attempts. Please try again after ${lockoutTime}.` 
      });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Increment failed login attempts
      await user.incLoginAttempts();
      
      // Get updated user to check if now locked
      const updatedUser = await User.findById(user._id);
      if (updatedUser.isLocked) {
        const lockoutTime = new Date(updatedUser.lockoutUntil).toLocaleString();
        return res.status(423).json({ 
          message: `Account has been locked due to multiple failed login attempts. Please try again after ${lockoutTime}.` 
        });
      }
      
      const SystemConfig = require('../models/SystemConfig');
      const config = await SystemConfig.findOne() || { maxFailedLoginAttempts: 5 };
      const remainingAttempts = config.maxFailedLoginAttempts - updatedUser.failedLoginAttempts;
      
      return res.status(400).json({ 
        message: `Invalid credentials. ${remainingAttempts} attempts remaining before account lockout.` 
      });
    }
    
    // Reset failed login attempts on successful login
    if (user.failedLoginAttempts > 0) {
      await user.resetLoginAttempts();
    }
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
    
    // After successful login, log the event (around line 127)
    await logAuditEvent({
      userId: user._id,
      action: 'login',
      resource: 'auth',
      details: `User ${user.name} logged in`,
      req: req, // Pass the request object
      userAgent: req.get('User-Agent')
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Logout route (now with proper auth import)
router.post('/logout', auth, async (req, res) => {
  try {
    // Log the logout event
    await logAuditEvent({
      userId: req.user._id,
      action: 'logout',
      resource: 'auth',
      details: `User ${req.user.name} logged out`,
      req: req, // Pass the request object
      userAgent: req.get('User-Agent')
    });
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    let passwordChanged = false;
    
    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to change password' });
      }
      
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      
      user.password = newPassword;
      passwordChanged = true;
    }
    
    // Only allow admins to update name and email in profile settings
    if (req.user.role === 'admin') {
      if (name) user.name = name;
      if (email) user.email = email;
    }
    
    await user.save();
    
    // Log different audit events based on what was changed
    if (passwordChanged) {
      await logAuditEvent({
        userId: user._id,
        action: 'update',
        resource: 'user_password',
        resourceId: user._id,
        details: `User ${user.name} changed their password`,
        req: req, // Pass the request object
        userAgent: req.get('User-Agent')
      });
    }
    
    if (req.user.role === 'admin' && (name || email)) {
      await logAuditEvent({
        userId: user._id,
        action: 'update',
        resource: 'user_profile',
        resourceId: user._id,
        details: `User ${user.name} updated their profile information`,
        req: req, // Pass the request object
        userAgent: req.get('User-Agent')
      });
    }
    
    res.json({
      message: passwordChanged ? 'Password updated successfully' : 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;