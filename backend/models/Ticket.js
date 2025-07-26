const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open',
  },
  category: {
    type: String,
    required: true,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Ticket', ticketSchema);