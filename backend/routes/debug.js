const express = require('express');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Debug route to check current user's role
router.get('/current-user', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isActive: req.user.isActive
      },
      message: `Current user role: ${req.user.role}`
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;