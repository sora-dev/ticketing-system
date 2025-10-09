const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Ticket = require('../models/Ticket');
const { auth } = require('../middleware/auth');
const router = express.Router();
const { logAuditEvent } = require('../utils/auditLogger');

// Configure multer for ticket image uploads
const uploadsDir = path.join(__dirname, '..', 'uploads', 'ticket-images');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.png';
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    cb(null, `${base}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files are allowed'));
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter
});

// Get dashboard stats
router.get('/dashboard', auth, async (req, res) => {
  try {
    let ticketFilter = {};
    let recentTicketsFilter = {};
    
    // Role-based filtering
    if (req.user.role === 'user') {
      ticketFilter = { createdBy: req.user._id };
      recentTicketsFilter = { createdBy: req.user._id };
    } else if (req.user.role === 'general-manager') {
      const gmCategories = ['access-request', 'system-error', 'system-config'];
      ticketFilter = { $or: [
        { createdBy: req.user._id },
        { category: { $in: gmCategories } }
      ] };
      recentTicketsFilter = { $or: [
        { createdBy: req.user._id },
        { category: { $in: gmCategories } }
      ] };
    }
    
    const totalTickets = await Ticket.countDocuments(ticketFilter);
    const openTickets = await Ticket.countDocuments({ ...ticketFilter, status: 'open' });
    const inProgressTickets = await Ticket.countDocuments({ ...ticketFilter, status: 'in-progress' });
    const resolvedTickets = await Ticket.countDocuments({ ...ticketFilter, status: 'resolved' });
    const urgentTickets = await Ticket.countDocuments({ ...ticketFilter, priority: 'urgent' });
    
    const recentTickets = await Ticket.find(recentTicketsFilter)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json({
      stats: {
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        urgentTickets
      },
      recentTickets
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all tickets
router.get('/', auth, async (req, res) => {
  try {
    let filter = {};
    
    // Role-based filtering
    if (req.user.role === 'user') {
      filter = { createdBy: req.user._id };
    } else if (req.user.role === 'general-manager') {
      filter = { $or: [
        { createdBy: req.user._id },
        { category: { $in: ['access-request', 'system-error', 'system-config'] } }
      ] };
    }
    
    const tickets = await Ticket.find(filter)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// MOVE THE REPORTS ROUTE HERE - BEFORE THE /:id ROUTE
router.get('/reports', auth, async (req, res) => {
  try {
    const { startDate, endDate, priority, status, category } = req.query;
    
    // Build filter object
    let filter = {};
    
    // Role-based filtering
    if (req.user.role === 'user') {
      filter.createdBy = req.user._id;
    } else if (req.user.role === 'general-manager') {
      filter.$or = [
        { createdBy: req.user._id },
        { category: { $in: ['access-request', 'system-error', 'system-config'] } }
      ];
    }
    
    // Date range filter
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    }
    
    // Additional filters
    if (priority) filter.priority = priority;
    if (status) filter.status = status;
    if (category) filter.category = category;
    
    // Get all tickets matching filter
    const tickets = await Ticket.find(filter)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: 1 });
    
    // Calculate metrics
    const totalTickets = tickets.length;
    const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    const resolutionRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;
    
    // Calculate average resolution time
    const resolvedTicketsWithTime = tickets.filter(t => 
      (t.status === 'resolved' || t.status === 'closed') && t.updatedAt
    );
    
    let averageResolutionTime = 0;
    if (resolvedTicketsWithTime.length > 0) {
      const totalResolutionTime = resolvedTicketsWithTime.reduce((sum, ticket) => {
        const resolutionTime = (new Date(ticket.updatedAt) - new Date(ticket.createdAt)) / (1000 * 60 * 60); // hours
        return sum + resolutionTime;
      }, 0);
      averageResolutionTime = Math.round(totalResolutionTime / resolvedTicketsWithTime.length);
    }
    
    // Generate daily trends data
    const dailyTrends = [];
    const dateRange = [];
    const start = new Date(startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const end = new Date(endDate || new Date());
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dateRange.push(new Date(d));
    }
    
    dateRange.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const created = tickets.filter(t => {
        const createdDate = new Date(t.createdAt);
        return createdDate >= dayStart && createdDate <= dayEnd;
      }).length;
      
      const resolved = tickets.filter(t => {
        const updatedDate = new Date(t.updatedAt);
        return (t.status === 'resolved' || t.status === 'closed') && 
               updatedDate >= dayStart && updatedDate <= dayEnd;
      }).length;
      
      dailyTrends.push({
        date: dateStr,
        created,
        resolved
      });
    });
    
    // Status breakdown
    const statusBreakdown = [
      { status: 'Open', count: tickets.filter(t => t.status === 'open').length },
      { status: 'In Progress', count: tickets.filter(t => t.status === 'in-progress').length },
      { status: 'Resolved', count: tickets.filter(t => t.status === 'resolved').length },
      { status: 'Closed', count: tickets.filter(t => t.status === 'closed').length }
    ].filter(item => item.count > 0);
    
    // Priority breakdown
    const priorityBreakdown = [
      { status: 'Low', count: tickets.filter(t => t.priority === 'low').length },
      { status: 'Medium', count: tickets.filter(t => t.priority === 'medium').length },
      { status: 'High', count: tickets.filter(t => t.priority === 'high').length },
      { status: 'Urgent', count: tickets.filter(t => t.priority === 'urgent').length }
    ].filter(item => item.count > 0);
    
    // Category breakdown
    const categoryBreakdown = {};
    tickets.forEach(ticket => {
      const cat = ticket.category || 'uncategorized';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
    });
    
    const categoryBreakdownArray = Object.entries(categoryBreakdown).map(([status, count]) => ({
      status: status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count
    }));
    
    res.json({
      metrics: {
        totalTickets,
        resolvedTickets,
        resolutionRate,
        averageResolutionTime
      },
      chartData: {
        dailyTrends,
        statusBreakdown,
        priorityBreakdown,
        categoryBreakdown: categoryBreakdownArray
      }
    });
    
  } catch (error) {
    console.error('Error generating reports:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single ticket by ID - MOVE THIS AFTER THE REPORTS ROUTE
router.get('/:id', auth, async (req, res) => {
  try {
    let filter = { _id: req.params.id };
    
    // If user role is 'user', only allow access to their own tickets
    if (req.user.role === 'user') {
      filter.createdBy = req.user._id;
    } else if (req.user.role === 'general-manager') {
      filter.$or = [
        { createdBy: req.user._id },
        { category: { $in: ['access-request', 'system-error', 'system-config'] } }
      ];
    }
    
    const ticket = await Ticket.findOne(filter)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('comments.user', 'name email');
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found or access denied' });
    }
    
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create ticket
// In ticket creation route:
// Create ticket
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, descriptionHtml, priority, category } = req.body;
    
    const ticket = new Ticket({
      title,
      description,
      descriptionHtml: descriptionHtml || '',
      priority,
      category,
      createdBy: req.user._id
    });
    
    await ticket.save();
    
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('createdBy', 'name email');
    
    res.status(201).json(populatedTicket);
    
    // Log the ticket creation - FIX THE BUG HERE
    await logAuditEvent({
      userId: req.user.id,
      action: 'create',
      resource: 'ticket',
      resourceId: ticket._id.toString(), // Changed from newTicket to ticket
      details: `Created ticket: ${ticket.title}`, // Changed from newTicket to ticket
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update ticket status
router.patch('/:id', auth, async (req, res) => {
  try {
    const { status, assignedTo, priority } = req.body;
    const updateData = {};

    if (status) updateData.status = status;
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (priority) {
      const allowed = ['low', 'medium', 'high', 'urgent'];
      if (!allowed.includes(priority)) {
        return res.status(400).json({ message: 'Invalid priority value' });
      }
      updateData.priority = priority;
    }

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Add audit logging for ticket updates
    await logAuditEvent({
      userId: req.user.id,
      action: 'update',
      resource: 'ticket',
      resourceId: ticket._id.toString(),
      details: `Updated ticket: ${ticket.title} - Status: ${status || 'unchanged'}, Assigned: ${assignedTo || 'unchanged'}, Priority: ${priority || 'unchanged'}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add comment to ticket
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { message, messageHtml } = req.body;

    if (!message && !messageHtml) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.comments.push({
      user: req.user._id,
      message: message || '',
      messageHtml: messageHtml || '',
      timestamp: new Date()
    });

    await ticket.save();

    const updatedTicket = await Ticket.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('comments.user', 'name email');

    res.json(updatedTicket);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload ticket image (used by WYSIWYG editor)
router.post('/upload-image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }
    const publicUrl = `/uploads/ticket-images/${req.file.filename}`;
    // Optionally, log audit
    await logAuditEvent({
      userId: req.user._id,
      action: 'create',
      resource: 'ticket_image',
      resourceId: req.file.filename,
      details: `Uploaded ticket image: ${req.file.originalname}`,
      req
    });
    res.json({ url: publicUrl });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;