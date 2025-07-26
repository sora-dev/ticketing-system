const mongoose = require('mongoose');

const knowledgeBaseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['account-management', 'transactions', 'cards', 'loans', 'technical-issues', 'security', 'mobile-banking', 'online-banking', 'general']
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPublished: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  },
  helpful: {
    type: Number,
    default: 0
  },
  notHelpful: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for search functionality
knowledgeBaseSchema.index({ title: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.model('KnowledgeBase', knowledgeBaseSchema);