const express = require('express');
const AuditLog = require('../models/AuditLog');
const { auth, adminAuth } = require('../middleware/auth');
const router = express.Router();

// Get audit logs (admin only)
router.get('/', auth, adminAuth, async (req, res) => {
  try {
    const {
      action,
      user,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (action) {
      filter.action = action;
    }
    
    if (user) {
      // Search by user name (requires population)
      const userFilter = {
        $or: [
          { 'user.name': { $regex: user, $options: 'i' } },
          { 'user.email': { $regex: user, $options: 'i' } }
        ]
      };
    }
    
    if (dateFrom || dateTo) {
      filter.timestamp = {};
      if (dateFrom) {
        filter.timestamp.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.timestamp.$lte = new Date(dateTo + 'T23:59:59.999Z');
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count for pagination
    const total = await AuditLog.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));
    
    // Get audit logs with user population
    let query = AuditLog.find(filter)
      .populate('user', 'name email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // If searching by user name/email, we need to handle it differently
    if (user) {
      const logs = await AuditLog.find()
        .populate('user', 'name email')
        .sort({ timestamp: -1 });
      
      const filteredLogs = logs.filter(log => {
        if (!log.user) return false;
        const userName = log.user.name?.toLowerCase() || '';
        const userEmail = log.user.email?.toLowerCase() || '';
        const searchTerm = user.toLowerCase();
        return userName.includes(searchTerm) || userEmail.includes(searchTerm);
      });
      
      const paginatedLogs = filteredLogs.slice(skip, skip + parseInt(limit));
      const filteredTotal = filteredLogs.length;
      const filteredTotalPages = Math.ceil(filteredTotal / parseInt(limit));
      
      return res.json({
        logs: paginatedLogs,
        totalPages: filteredTotalPages,
        currentPage: parseInt(page),
        total: filteredTotal
      });
    }
    
    const logs = await query;
    
    res.json({
      logs,
      totalPages,
      currentPage: parseInt(page),
      total
    });
    
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create audit log entry (internal use)
router.post('/', async (req, res) => {
  try {
    const auditLog = new AuditLog(req.body);
    await auditLog.save();
    res.status(201).json(auditLog);
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add this temporary route for testing (remove after testing)
// Remove this entire test route (lines 89-109)
// router.post('/test', auth, adminAuth, async (req, res) => {
//   try {
//     const testLogs = [
//       {
//         user: req.user.id,
//         action: 'login',
//         resource: 'auth',
//         details: 'Test login event',
//         ipAddress: '127.0.0.1'
//       },
//       {
//         user: req.user.id,
//         action: 'create',
//         resource: 'ticket',
//         details: 'Test ticket creation',
//         ipAddress: '127.0.0.1'
//       }
//     ];
//     
//     await AuditLog.insertMany(testLogs);
//     res.json({ message: 'Test audit logs created' });
//   } catch (error) {
//     res.status(500).json({ message: 'Error creating test logs' });
//   }
// });
module.exports = router;